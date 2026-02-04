import { sql } from '@vercel/postgres';
import { RegistrationSchedule, RegistrationLog, UserConfig, RegistrationStatus, Donation, DonationStatus } from './types/uth';

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

    // ============ ADMIN TABLES ============

    // Login history table - Lịch sử đăng nhập của users
    await sql`
      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT,
        ip_address TEXT,
        user_agent TEXT,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT true,
        error_message TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_history_student ON login_history(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_time DESC)`;

    // Allowed users table - Whitelist MSSV được phép sử dụng
    await sql`
      CREATE TABLE IF NOT EXISTS allowed_users (
        id SERIAL PRIMARY KEY,
        student_id TEXT UNIQUE NOT NULL,
        student_name TEXT,
        note TEXT,
        is_active BOOLEAN DEFAULT true,
        is_pro BOOLEAN DEFAULT false,
        added_by TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_allowed_users_student ON allowed_users(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_allowed_users_active ON allowed_users(is_active)`;
    
    // Migration: Add is_pro column if not exists
    await sql`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='allowed_users' AND column_name='is_pro') THEN
          ALTER TABLE allowed_users ADD COLUMN is_pro BOOLEAN DEFAULT false;
        END IF;
      END $$;
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_allowed_users_pro ON allowed_users(is_pro)`;

    // Admin sessions table - Lưu session admin
    await sql`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id SERIAL PRIMARY KEY,
        session_token TEXT UNIQUE NOT NULL,
        ip_address TEXT,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(session_token)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at)`;

    // Access requests table - Yêu cầu cấp quyền truy cập
    await sql`
      CREATE TABLE IF NOT EXISTS access_requests (
        id SERIAL PRIMARY KEY,
        student_id TEXT NOT NULL,
        student_name TEXT NOT NULL,
        email TEXT,
        reason TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        admin_note TEXT,
        ip_address TEXT,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_access_requests_student ON access_requests(student_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status)`;

    // Donations table
    await sql`
      CREATE TABLE IF NOT EXISTS donations (
        id SERIAL PRIMARY KEY,
        user_session TEXT NOT NULL,
        email TEXT NOT NULL,
        student_id TEXT,
        amount INTEGER NOT NULL,
        transfer_content TEXT NOT NULL,
        registration_period_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
        approved_by TEXT,
        approved_at TIMESTAMP,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS idx_donations_user_session ON donations(user_session)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_donations_email ON donations(email)`;

    // Site settings table - Cài đặt trang web
    await sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    // Initialize default settings
    await sql`
      INSERT INTO site_settings (key, value)
      VALUES 
        ('maintenance_mode', 'false'),
        ('maintenance_message', 'Hệ thống đang bảo trì, vui lòng quay lại sau.')
      ON CONFLICT (key) DO NOTHING
    `;

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

// Donation operations
export const donationDb = {
  insert: async (donation: Omit<Donation, 'id' | 'created_at' | 'status' | 'approved_by' | 'approved_at'>) => {
    const result = await sql`
      INSERT INTO donations 
      (user_session, email, student_id, amount, transfer_content, registration_period_id, note)
      VALUES (
        ${donation.user_session},
        ${donation.email},
        ${donation.student_id || null},
        ${donation.amount},
        ${donation.transfer_content},
        ${donation.registration_period_id},
        ${donation.note || null}
      )
      RETURNING id
    `;
    return { changes: result.rowCount, lastInsertRowid: result.rows[0]?.id };
  },

  findBySession: async (userSession: string): Promise<Donation[]> => {
    const result = await sql`
      SELECT * FROM donations 
      WHERE user_session = ${userSession} 
      ORDER BY created_at DESC
    `;
    return result.rows as Donation[];
  },

  findByEmail: async (email: string): Promise<Donation[]> => {
    const result = await sql`
      SELECT * FROM donations 
      WHERE email = ${email} 
      ORDER BY created_at DESC
    `;
    return result.rows as Donation[];
  },

  getAll: async (status?: DonationStatus | null, page: number = 1, limit: number = 50): Promise<Donation[]> => {
    const offset = (page - 1) * limit;
    if (status) {
      const result = await sql`
        SELECT * FROM donations 
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      return result.rows as Donation[];
    }
    const result = await sql`
      SELECT * FROM donations 
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return result.rows as Donation[];
  },

  findAll: async (status?: DonationStatus): Promise<Donation[]> => {
    if (status) {
      const result = await sql`
        SELECT * FROM donations 
        WHERE status = ${status}
        ORDER BY created_at DESC
      `;
      return result.rows as Donation[];
    }
    const result = await sql`
      SELECT * FROM donations 
      ORDER BY created_at DESC
    `;
    return result.rows as Donation[];
  },

  findById: async (id: number): Promise<Donation | undefined> => {
    const result = await sql`
      SELECT * FROM donations WHERE id = ${id}
    `;
    return result.rows[0] as Donation | undefined;
  },

  hasActivePro: async (userSession: string, registrationPeriodId: number): Promise<boolean> => {
    const result = await sql`
      SELECT COUNT(*) as count FROM donations 
      WHERE user_session = ${userSession} 
      AND registration_period_id = ${registrationPeriodId}
      AND status = 'approved'
      AND amount >= 12000
    `;
    return Number(result.rows[0]?.count || 0) > 0;
  },

  getTotalDonated: async (userSession: string): Promise<number> => {
    const result = await sql`
      SELECT COALESCE(SUM(amount), 0) as total FROM donations 
      WHERE user_session = ${userSession} AND status = 'approved'
    `;
    return Number(result.rows[0]?.total || 0);
  },

  getTopDonors: async (limit: number = 10): Promise<{ email: string; total: number; count: number }[]> => {
    const result = await sql`
      SELECT 
        email,
        SUM(amount) as total,
        COUNT(*) as count
      FROM donations 
      WHERE status = 'approved'
      GROUP BY email
      ORDER BY total DESC
      LIMIT ${limit}
    `;
    return result.rows as { email: string; total: number; count: number }[];
  },

  getStats: async (): Promise<{ total_amount: number; total_donors: number; total_donations: number }> => {
    const result = await sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(DISTINCT email) as total_donors,
        COUNT(*) as total_donations
      FROM donations 
      WHERE status = 'approved'
    `;
    return {
      total_amount: Number(result.rows[0]?.total_amount || 0),
      total_donors: Number(result.rows[0]?.total_donors || 0),
      total_donations: Number(result.rows[0]?.total_donations || 0)
    };
  },

  updateStatus: async (id: number, status: DonationStatus, approvedBy?: string, note?: string) => {
    if (status === 'approved' && approvedBy) {
      const result = await sql`
        UPDATE donations 
        SET status = ${status}, approved_by = ${approvedBy}, approved_at = CURRENT_TIMESTAMP, note = COALESCE(${note || null}, note)
        WHERE id = ${id}
      `;
      return { changes: result.rowCount };
    }
    const result = await sql`
      UPDATE donations 
      SET status = ${status}, note = COALESCE(${note || null}, note)
      WHERE id = ${id}
    `;
    return { changes: result.rowCount };
  },

  delete: async (id: number) => {
    const result = await sql`
      DELETE FROM donations WHERE id = ${id}
    `;
    return { changes: result.rowCount };
  }
};

// Site settings operations
export const siteSettingsDb = {
  // Ensure table exists
  ensureTable: async () => {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS site_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
    } catch (error) {
      console.error('Error creating site_settings table:', error);
    }
  },

  get: async (key: string): Promise<string | null> => {
    try {
      await siteSettingsDb.ensureTable();
      const result = await sql`
        SELECT value FROM site_settings WHERE key = ${key}
      `;
      return result.rows[0]?.value || null;
    } catch (error) {
      console.error('Error getting site setting:', error);
      return null;
    }
  },

  set: async (key: string, value: string) => {
    try {
      await siteSettingsDb.ensureTable();
      const result = await sql`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES (${key}, ${value}, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET
          value = ${value},
          updated_at = CURRENT_TIMESTAMP
      `;
      return { changes: result.rowCount };
    } catch (error) {
      console.error('Error setting site setting:', error);
      return { changes: 0 };
    }
  },

  isMaintenanceMode: async (): Promise<boolean> => {
    try {
      await siteSettingsDb.ensureTable();
      const result = await sql`
        SELECT value FROM site_settings WHERE key = 'maintenance_mode'
      `;
      return result.rows[0]?.value === 'true';
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
      return false; // Default to not in maintenance mode
    }
  },

  getMaintenanceMessage: async (): Promise<string> => {
    try {
      await siteSettingsDb.ensureTable();
      const result = await sql`
        SELECT value FROM site_settings WHERE key = 'maintenance_message'
      `;
      return result.rows[0]?.value || 'Hệ thống đang bảo trì, vui lòng quay lại sau.';
    } catch (error) {
      console.error('Error getting maintenance message:', error);
      return 'Hệ thống đang bảo trì, vui lòng quay lại sau.';
    }
  },

  setMaintenanceMode: async (enabled: boolean, message?: string) => {
    try {
      await siteSettingsDb.ensureTable();
      await sql`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES ('maintenance_mode', ${enabled ? 'true' : 'false'}, CURRENT_TIMESTAMP)
        ON CONFLICT (key) DO UPDATE SET
          value = ${enabled ? 'true' : 'false'},
          updated_at = CURRENT_TIMESTAMP
      `;
      
      if (message !== undefined) {
        await sql`
          INSERT INTO site_settings (key, value, updated_at)
          VALUES ('maintenance_message', ${message}, CURRENT_TIMESTAMP)
          ON CONFLICT (key) DO UPDATE SET
            value = ${message},
            updated_at = CURRENT_TIMESTAMP
        `;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error setting maintenance mode:', error);
      return { success: false };
    }
  }
};

// Database utility functions
export function closeDatabase() {
  // No-op for Vercel Postgres (connection pooling handled automatically)
}

export function getDatabase() {
  return sql;
}
