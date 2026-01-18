import { sql } from '@vercel/postgres';
import { RegistrationSchedule, RegistrationLog, UserConfig, RegistrationStatus } from './types/uth';

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

// Database utility functions
export function closeDatabase() {
  // No-op for Vercel Postgres (connection pooling handled automatically)
}

export function getDatabase() {
  return sql;
}
