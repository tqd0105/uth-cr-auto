import { sql } from '@vercel/postgres';
import { RegistrationSchedule, RegistrationLog, UserConfig, RegistrationStatus } from './types/uth';

// Waitlist status enum
export enum WaitlistStatus {
  WAITING = 'waiting',
  REGISTERED = 'registered',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface WaitlistEntry {
  id: number;
  user_session: string;
  course_code: string;
  course_name: string;
  class_id: string;
  class_code: string;
  priority: number;
  status: WaitlistStatus;
  check_interval: number; // seconds
  last_checked?: string;
  created_at: string;
  updated_at?: string;
}

// Initialize database tables
export async function initDatabase() {
  try {
    // User configurations table
    await sql`
      CREATE TABLE IF NOT EXISTS user_configs (
        id SERIAL PRIMARY KEY,
        user_session TEXT UNIQUE NOT NULL,
        uth_cookies TEXT NOT NULL,
        notification_email TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Registration schedules table
    await sql`
      CREATE TABLE IF NOT EXISTS registration_schedules (
        id SERIAL PRIMARY KEY,
        user_session TEXT NOT NULL,
        course_code TEXT NOT NULL,
        course_name TEXT NOT NULL,
        class_id TEXT NOT NULL,
        class_code TEXT NOT NULL,
        schedule_time TIMESTAMP NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        retry_count INTEGER DEFAULT 0,
        max_retries INTEGER DEFAULT 5,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Registration logs table
    await sql`
      CREATE TABLE IF NOT EXISTS registration_logs (
        id SERIAL PRIMARY KEY,
        user_session TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('register', 'cancel')),
        course_name TEXT NOT NULL,
        class_code TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_user ON registration_schedules(user_session)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_status ON registration_schedules(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_schedules_time ON registration_schedules(schedule_time)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_logs_user ON registration_logs(user_session)`;

    // Waitlist table
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        user_session TEXT NOT NULL,
        course_code TEXT NOT NULL,
        course_name TEXT NOT NULL,
        class_id TEXT NOT NULL,
        class_code TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'waiting',
        check_interval INTEGER DEFAULT 30,
        last_checked TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_session, class_id)
      )
    `;

    // Waitlist indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_user ON waitlist(user_session)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_waitlist_status ON waitlist(status)`;

    // Issue reports table
    await sql`
      CREATE TABLE IF NOT EXISTS issue_reports (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        issue_type TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        user_agent TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Issue reports index
    await sql`CREATE INDEX IF NOT EXISTS idx_reports_status ON issue_reports(status)`;

    // Consent logs table - Ghi nhận người dùng đồng ý điều khoản
    await sql`
      CREATE TABLE IF NOT EXISTS consent_logs (
        id SERIAL PRIMARY KEY,
        session_id TEXT NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        screen_resolution TEXT,
        timezone TEXT,
        language TEXT,
        consent_version TEXT NOT NULL DEFAULT '1.0',
        accepted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        student_id TEXT,
        student_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Consent logs index
    await sql`CREATE INDEX IF NOT EXISTS idx_consent_session ON consent_logs(session_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_consent_student ON consent_logs(student_id)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// User config operations
export const userConfigDb = {
  insert: async (userConfig: Omit<UserConfig, 'id' | 'created_at'>) => {
    const result = await sql`
      INSERT INTO user_configs (user_session, uth_cookies)
      VALUES (${userConfig.user_session}, ${userConfig.uth_cookies})
      ON CONFLICT(user_session) DO UPDATE SET
        uth_cookies = ${userConfig.uth_cookies},
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  },

  findBySession: async (userSession: string): Promise<UserConfig | undefined> => {
    const result = await sql`
      SELECT * FROM user_configs WHERE user_session = ${userSession}
    `;
    return result.rows[0] as UserConfig | undefined;
  },

  updateNotificationEmail: async (userSession: string, email: string | null) => {
    const result = await sql`
      UPDATE user_configs 
      SET notification_email = ${email}, updated_at = CURRENT_TIMESTAMP 
      WHERE user_session = ${userSession}
    `;
    return { changes: result.rowCount };
  },

  delete: async (userSession: string) => {
    const result = await sql`
      DELETE FROM user_configs WHERE user_session = ${userSession}
    `;
    return { changes: result.rowCount };
  }
};

// Registration schedule operations
export const registrationScheduleDb = {
  insert: async (schedule: Omit<RegistrationSchedule, 'id' | 'created_at' | 'updated_at'>) => {
    const result = await sql`
      INSERT INTO registration_schedules 
      (user_session, course_code, course_name, class_id, class_code, schedule_time, status, retry_count, max_retries)
      VALUES (
        ${schedule.user_session},
        ${schedule.course_code},
        ${schedule.course_name || ''},
        ${schedule.class_id},
        ${schedule.class_code || ''},
        ${schedule.schedule_time},
        ${schedule.status},
        ${schedule.retry_count || 0},
        ${schedule.max_retries || 5}
      )
      RETURNING id
    `;
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  },

  findById: async (id: number): Promise<RegistrationSchedule | undefined> => {
    const result = await sql`
      SELECT * FROM registration_schedules WHERE id = ${id}
    `;
    return result.rows[0] as RegistrationSchedule | undefined;
  },

  findPending: async (): Promise<RegistrationSchedule[]> => {
    const result = await sql`
      SELECT * FROM registration_schedules 
      WHERE status IN ('pending', 'retry') 
      AND schedule_time <= CURRENT_TIMESTAMP
      ORDER BY schedule_time ASC
    `;
    return result.rows as RegistrationSchedule[];
  },

  findByUserSession: async (userSession: string): Promise<RegistrationSchedule[]> => {
    const result = await sql`
      SELECT * FROM registration_schedules 
      WHERE user_session = ${userSession} 
      ORDER BY schedule_time DESC
    `;
    return result.rows as RegistrationSchedule[];
  },

  updateStatus: async (id: number, status: RegistrationStatus, errorMessage?: string, incrementRetry: boolean = false) => {
    if (incrementRetry && errorMessage) {
      const result = await sql`
        UPDATE registration_schedules 
        SET status = ${status}, error_message = ${errorMessage}, retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      return { changes: result.rowCount };
    } else if (errorMessage) {
      const result = await sql`
        UPDATE registration_schedules 
        SET status = ${status}, error_message = ${errorMessage}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      return { changes: result.rowCount };
    } else if (incrementRetry) {
      const result = await sql`
        UPDATE registration_schedules 
        SET status = ${status}, retry_count = retry_count + 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      return { changes: result.rowCount };
    } else {
      const result = await sql`
        UPDATE registration_schedules 
        SET status = ${status}, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
      `;
      return { changes: result.rowCount };
    }
  },

  delete: async (id: number) => {
    const result = await sql`
      DELETE FROM registration_schedules WHERE id = ${id}
    `;
    return { changes: result.rowCount };
  },

  deleteByUserSession: async (userSession: string) => {
    const result = await sql`
      DELETE FROM registration_schedules WHERE user_session = ${userSession}
    `;
    return { changes: result.rowCount };
  }
};

// Registration log operations
export const registrationLogDb = {
  insert: async (log: Omit<RegistrationLog, 'id' | 'created_at'>) => {
    const result = await sql`
      INSERT INTO registration_logs 
      (user_session, action, course_name, class_code, status, message)
      VALUES (
        ${log.user_session},
        ${log.action},
        ${log.course_name},
        ${log.class_code},
        ${log.status},
        ${log.message}
      )
      RETURNING id
    `;
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  },

  findByUserSession: async (userSession: string, limit: number = 50): Promise<RegistrationLog[]> => {
    const result = await sql`
      SELECT * FROM registration_logs 
      WHERE user_session = ${userSession} 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
    return result.rows as RegistrationLog[];
  },

  findAll: async (limit: number = 100): Promise<RegistrationLog[]> => {
    const result = await sql`
      SELECT * FROM registration_logs 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
    return result.rows as RegistrationLog[];
  }
};

// Waitlist operations
export const waitlistDb = {
  insert: async (entry: Omit<WaitlistEntry, 'id' | 'created_at' | 'updated_at' | 'last_checked'>) => {
    const result = await sql`
      INSERT INTO waitlist 
      (user_session, course_code, course_name, class_id, class_code, priority, status, check_interval)
      VALUES (
        ${entry.user_session},
        ${entry.course_code},
        ${entry.course_name},
        ${entry.class_id},
        ${entry.class_code},
        ${entry.priority || 1},
        ${entry.status || 'waiting'},
        ${entry.check_interval || 30}
      )
      ON CONFLICT(user_session, class_id) DO UPDATE SET
        priority = ${entry.priority || 1},
        status = 'waiting',
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  },

  findById: async (id: number): Promise<WaitlistEntry | undefined> => {
    const result = await sql`
      SELECT * FROM waitlist WHERE id = ${id}
    `;
    return result.rows[0] as WaitlistEntry | undefined;
  },

  findByUserSession: async (userSession: string): Promise<WaitlistEntry[]> => {
    const result = await sql`
      SELECT * FROM waitlist 
      WHERE user_session = ${userSession} 
      ORDER BY priority ASC, created_at ASC
    `;
    return result.rows as WaitlistEntry[];
  },

  findWaiting: async (): Promise<WaitlistEntry[]> => {
    const result = await sql`
      SELECT * FROM waitlist 
      WHERE status = 'waiting'
      ORDER BY priority ASC, created_at ASC
    `;
    return result.rows as WaitlistEntry[];
  },

  findWaitingByUser: async (userSession: string): Promise<WaitlistEntry[]> => {
    const result = await sql`
      SELECT * FROM waitlist 
      WHERE user_session = ${userSession} AND status = 'waiting'
      ORDER BY priority ASC, created_at ASC
    `;
    return result.rows as WaitlistEntry[];
  },

  updateStatus: async (id: number, status: WaitlistStatus) => {
    const result = await sql`
      UPDATE waitlist 
      SET status = ${status}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
    return { changes: result.rowCount };
  },

  updateLastChecked: async (id: number) => {
    const result = await sql`
      UPDATE waitlist 
      SET last_checked = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;
    return { changes: result.rowCount };
  },

  delete: async (id: number) => {
    const result = await sql`
      DELETE FROM waitlist WHERE id = ${id}
    `;
    return { changes: result.rowCount };
  },

  deleteByUserSession: async (userSession: string) => {
    const result = await sql`
      DELETE FROM waitlist WHERE user_session = ${userSession}
    `;
    return { changes: result.rowCount };
  }
};

// Database utility functions
export function closeDatabase() {
  // No-op for Vercel Postgres (connection pooling handled automatically)
}

export function getDatabase() {
  return sql;
}
