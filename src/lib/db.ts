import Database from 'better-sqlite3';
import path from 'path';
import { RegistrationSchedule, RegistrationLog, UserConfig, RegistrationStatus, ScheduleNotificationSettings, ClassReminder, Donation, DonationStatus } from './types/uth';

// Use PostgreSQL in production, SQLite for development
const isProduction = process.env.NODE_ENV === 'production';

// SQLite setup for local development
const DB_PATH = path.join(process.cwd(), 'data', 'uth-cr-auto.db');
let db: Database.Database;

export function initDatabase() {
  try {
    if (isProduction) {
      // In production, use PostgreSQL - import dynamically
      console.log('Using PostgreSQL database for production');
      const { initDatabase: initPostgres } = require('./db-postgres');
      return initPostgres();
    }
    
    // Local development with SQLite
    console.log('Using SQLite database for development');
    
    // Create data directory if it doesn't exist
    const fs = require('fs');
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables
    createTables();
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

function createTables() {
  // User configurations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_session TEXT UNIQUE NOT NULL,
      uth_cookies TEXT NOT NULL,
      notification_email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add notification_email column if it doesn't exist (for existing databases)
  try {
    db.exec(`ALTER TABLE user_configs ADD COLUMN notification_email TEXT`);
  } catch (e) {
    // Column already exists, ignore
  }

  // Registration schedules table
  db.exec(`
    CREATE TABLE IF NOT EXISTS registration_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_session TEXT NOT NULL,
      course_code TEXT NOT NULL,
      course_name TEXT NOT NULL,
      class_id TEXT NOT NULL,
      class_code TEXT NOT NULL,
      schedule_time DATETIME NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      retry_count INTEGER DEFAULT 0,
      max_retries INTEGER DEFAULT 5,
      error_message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_session) REFERENCES user_configs(user_session)
    )
  `);

  // Registration logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS registration_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_session TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('register', 'cancel')),
      course_name TEXT NOT NULL,
      class_code TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_session) REFERENCES user_configs(user_session)
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_registration_schedules_user_session 
    ON registration_schedules(user_session);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_registration_schedules_status 
    ON registration_schedules(status);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_registration_schedules_schedule_time 
    ON registration_schedules(schedule_time);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_registration_logs_user_session 
    ON registration_logs(user_session);
  `);

  // Schedule notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schedule_notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_session TEXT UNIQUE NOT NULL,
      email TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 0,
      notification_type TEXT DEFAULT 'daily' CHECK (notification_type IN ('daily', 'weekly')),
      notification_time TEXT DEFAULT '07:00',
      custom_title TEXT,
      send_day_before INTEGER DEFAULT 1,
      last_sent_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_session) REFERENCES user_configs(user_session)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_schedule_notifications_user_session 
    ON schedule_notifications(user_session);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_schedule_notifications_is_enabled 
    ON schedule_notifications(is_enabled);
  `);

  // Class reminders table (nhắc nhở từng buổi học)
  db.exec(`
    CREATE TABLE IF NOT EXISTS class_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_session TEXT NOT NULL,
      email TEXT NOT NULL,
      class_id TEXT NOT NULL,
      class_name TEXT NOT NULL,
      class_date TEXT NOT NULL,
      class_time TEXT NOT NULL,
      room TEXT,
      remind_before INTEGER DEFAULT 30,
      is_sent INTEGER DEFAULT 0,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_session) REFERENCES user_configs(user_session)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_class_reminders_user_session 
    ON class_reminders(user_session);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_class_reminders_class_date 
    ON class_reminders(class_date);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_class_reminders_is_sent 
    ON class_reminders(is_sent);
  `);

  // Donations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_session TEXT NOT NULL,
      email TEXT NOT NULL,
      student_id TEXT,
      amount INTEGER NOT NULL,
      transfer_content TEXT NOT NULL,
      registration_period_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
      approved_by TEXT,
      approved_at DATETIME,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_session) REFERENCES user_configs(user_session)
    )
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_donations_user_session 
    ON donations(user_session);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_donations_status 
    ON donations(status);
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_donations_registration_period_id 
    ON donations(registration_period_id);
  `);
}

// User config operations
export const userConfigDb = {
  insert: (userConfig: Omit<UserConfig, 'id' | 'created_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO user_configs (user_session, uth_cookies)
      VALUES (?, ?)
      ON CONFLICT(user_session) DO UPDATE SET
        uth_cookies = ?,
        updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(userConfig.user_session, userConfig.uth_cookies, userConfig.uth_cookies);
  },

  findBySession: (userSession: string): UserConfig | undefined => {
    const stmt = db.prepare('SELECT * FROM user_configs WHERE user_session = ?');
    return stmt.get(userSession) as UserConfig | undefined;
  },

  updateNotificationEmail: (userSession: string, email: string | null) => {
    const stmt = db.prepare(`
      UPDATE user_configs 
      SET notification_email = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE user_session = ?
    `);
    return stmt.run(email, userSession);
  },

  delete: (userSession: string) => {
    const stmt = db.prepare('DELETE FROM user_configs WHERE user_session = ?');
    return stmt.run(userSession);
  }
};

// Registration schedule operations
export const registrationScheduleDb = {
  insert: (schedule: Omit<RegistrationSchedule, 'id' | 'created_at' | 'updated_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO registration_schedules 
      (user_session, course_code, course_name, class_id, class_code, schedule_time, status, retry_count, max_retries)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      schedule.user_session,
      schedule.course_code,
      schedule.course_name || '',
      schedule.class_id,
      schedule.class_code || '',
      schedule.schedule_time,
      schedule.status,
      schedule.retry_count || 0,
      schedule.max_retries || 5
    );
  },

  findById: (id: number): RegistrationSchedule | undefined => {
    const stmt = db.prepare('SELECT * FROM registration_schedules WHERE id = ?');
    return stmt.get(id) as RegistrationSchedule | undefined;
  },

  findPending: (): RegistrationSchedule[] => {
    const stmt = db.prepare(`
      SELECT * FROM registration_schedules 
      WHERE status IN ('pending', 'retry') 
      AND schedule_time <= CURRENT_TIMESTAMP
      ORDER BY schedule_time ASC
    `);
    return stmt.all() as RegistrationSchedule[];
  },

  findByUserSession: (userSession: string): RegistrationSchedule[] => {
    const stmt = db.prepare(`
      SELECT * FROM registration_schedules 
      WHERE user_session = ? 
      ORDER BY schedule_time DESC
    `);
    return stmt.all(userSession) as RegistrationSchedule[];
  },

  updateStatus: (id: number, status: RegistrationStatus, errorMessage?: string, incrementRetry: boolean = false) => {
    let query = `
      UPDATE registration_schedules 
      SET status = ?, updated_at = CURRENT_TIMESTAMP
    `;
    const params: any[] = [status];

    if (errorMessage) {
      query += `, error_message = ?`;
      params.push(errorMessage);
    }

    if (incrementRetry) {
      query += `, retry_count = retry_count + 1`;
    }

    query += ` WHERE id = ?`;
    params.push(id);

    const stmt = db.prepare(query);
    return stmt.run(...params);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM registration_schedules WHERE id = ?');
    return stmt.run(id);
  },

  deleteByUserSession: (userSession: string) => {
    const stmt = db.prepare('DELETE FROM registration_schedules WHERE user_session = ?');
    return stmt.run(userSession);
  }
};

// Registration log operations
export const registrationLogDb = {
  insert: (log: Omit<RegistrationLog, 'id' | 'created_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO registration_logs 
      (user_session, action, course_name, class_code, status, message)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      log.user_session,
      log.action,
      log.course_name,
      log.class_code,
      log.status,
      log.message
    );
  },

  findByUserSession: (userSession: string, limit: number = 50): RegistrationLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM registration_logs 
      WHERE user_session = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(userSession, limit) as RegistrationLog[];
  },

  findAll: (limit: number = 100): RegistrationLog[] => {
    const stmt = db.prepare(`
      SELECT * FROM registration_logs 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as RegistrationLog[];
  }
};

// Schedule notification operations
type ScheduleNotificationRow = Omit<ScheduleNotificationSettings, 'is_enabled' | 'send_day_before'> & {
  is_enabled: number;
  send_day_before: number;
};

export const scheduleNotificationDb = {
  upsert: (settings: Omit<ScheduleNotificationSettings, 'id' | 'created_at' | 'updated_at' | 'last_sent_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO schedule_notifications 
      (user_session, email, is_enabled, notification_type, notification_time, custom_title, send_day_before)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_session) DO UPDATE SET
        email = excluded.email,
        is_enabled = excluded.is_enabled,
        notification_type = excluded.notification_type,
        notification_time = excluded.notification_time,
        custom_title = excluded.custom_title,
        send_day_before = excluded.send_day_before,
        updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(
      settings.user_session,
      settings.email,
      settings.is_enabled ? 1 : 0,
      settings.notification_type,
      settings.notification_time,
      settings.custom_title || null,
      settings.send_day_before ? 1 : 0
    );
  },

  findBySession: (userSession: string): ScheduleNotificationSettings | undefined => {
    const stmt = db.prepare('SELECT * FROM schedule_notifications WHERE user_session = ?');
    const result = stmt.get(userSession) as ScheduleNotificationRow | undefined;
    console.log('ScheduleNotificationSettings result:', result);
    if (result) {
      return {
        ...result,
        is_enabled: Boolean(result.is_enabled),
        send_day_before: Boolean(result.send_day_before)
      };
    }
    return undefined;
  },

  findAllEnabled: (): ScheduleNotificationSettings[] => {
    const stmt = db.prepare(`
      SELECT sn.*, uc.uth_cookies 
      FROM schedule_notifications sn
      JOIN user_configs uc ON sn.user_session = uc.user_session
      WHERE sn.is_enabled = 1
    `);
    const results = stmt.all() as ScheduleNotificationRow[];
    return results.map(r => ({
      ...r,
      is_enabled: Boolean(r.is_enabled),
      send_day_before: Boolean(r.send_day_before)
    }));
  },

  updateLastSent: (userSession: string) => {
    const stmt = db.prepare(`
      UPDATE schedule_notifications 
      SET last_sent_at = CURRENT_TIMESTAMP 
      WHERE user_session = ?
    `);
    return stmt.run(userSession);
  },

  delete: (userSession: string) => {
    const stmt = db.prepare('DELETE FROM schedule_notifications WHERE user_session = ?');
    return stmt.run(userSession);
  }
};

// Class reminder operations
type ClassReminderRow = Omit<ClassReminder, 'is_sent'> & {
  is_sent: number;
};

export const classReminderDb = {
  insert: (reminder: Omit<ClassReminder, 'id' | 'created_at' | 'is_sent'>) => {
    const stmt = db.prepare(`
      INSERT INTO class_reminders 
      (user_session, email, class_id, class_name, class_date, class_time, room, remind_before, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      reminder.user_session,
      reminder.email,
      reminder.class_id,
      reminder.class_name,
      reminder.class_date,
      reminder.class_time,
      reminder.room || '',
      reminder.remind_before,
      reminder.note || null
    );
  },

  findBySession: (userSession: string): ClassReminder[] => {
    const stmt = db.prepare(`
      SELECT * FROM class_reminders 
      WHERE user_session = ? 
      ORDER BY class_date ASC, class_time ASC
    `);
    const results = stmt.all(userSession) as ClassReminderRow[];
    return results.map(r => ({ ...r, is_sent: Boolean(r.is_sent) }));
  },

  findPending: (): ClassReminder[] => {
    const stmt = db.prepare(`
      SELECT * FROM class_reminders 
      WHERE is_sent = 0 AND class_date >= date('now')
      ORDER BY class_date ASC, class_time ASC
    `);
    const results = stmt.all() as ClassReminderRow[];
    return results.map(r => ({ ...r, is_sent: Boolean(r.is_sent) }));
  },

  findByClassAndDate: (userSession: string, classId: string, classDate: string): ClassReminder | undefined => {
    const stmt = db.prepare(`
      SELECT * FROM class_reminders 
      WHERE user_session = ? AND class_id = ? AND class_date = ?
    `);
    const result = stmt.get(userSession, classId, classDate) as ClassReminderRow | undefined;
    if (result) {
      return { ...result, is_sent: Boolean(result.is_sent) };
    }
    return undefined;
  },

  markSent: (id: number) => {
    const stmt = db.prepare('UPDATE class_reminders SET is_sent = 1 WHERE id = ?');
    return stmt.run(id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM class_reminders WHERE id = ?');
    return stmt.run(id);
  },

  deleteBySession: (userSession: string) => {
    const stmt = db.prepare('DELETE FROM class_reminders WHERE user_session = ?');
    return stmt.run(userSession);
  }
};

// Donation operations
export const donationDb = {
  insert: (donation: Omit<Donation, 'id' | 'created_at' | 'status' | 'approved_by' | 'approved_at'>) => {
    const stmt = db.prepare(`
      INSERT INTO donations 
      (user_session, email, student_id, amount, transfer_content, registration_period_id, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      donation.user_session,
      donation.email,
      donation.student_id || null,
      donation.amount,
      donation.transfer_content,
      donation.registration_period_id,
      donation.note || null
    );
  },

  findBySession: (userSession: string): Donation[] => {
    const stmt = db.prepare(`
      SELECT * FROM donations 
      WHERE user_session = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(userSession) as Donation[];
  },

  findByEmail: (email: string): Donation[] => {
    const stmt = db.prepare(`
      SELECT * FROM donations 
      WHERE email = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(email) as Donation[];
  },

  getAll: (status?: DonationStatus | null, page: number = 1, limit: number = 50): Donation[] => {
    const offset = (page - 1) * limit;
    if (status) {
      const stmt = db.prepare(`
        SELECT * FROM donations 
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `);
      return stmt.all(status, limit, offset) as Donation[];
    }
    const stmt = db.prepare(`
      SELECT * FROM donations 
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(limit, offset) as Donation[];
  },

  findAll: (status?: DonationStatus): Donation[] => {
    if (status) {
      const stmt = db.prepare(`
        SELECT * FROM donations 
        WHERE status = ?
        ORDER BY created_at DESC
      `);
      return stmt.all(status) as Donation[];
    }
    const stmt = db.prepare(`
      SELECT * FROM donations 
      ORDER BY created_at DESC
    `);
    return stmt.all() as Donation[];
  },

  findById: (id: number): Donation | undefined => {
    const stmt = db.prepare('SELECT * FROM donations WHERE id = ?');
    return stmt.get(id) as Donation | undefined;
  },

  // Check if user has active pro for a specific registration period
  hasActivePro: (userSession: string, registrationPeriodId: number): boolean => {
    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM donations 
      WHERE user_session = ? 
      AND registration_period_id = ? 
      AND status = 'approved'
      AND amount >= 12000
    `);
    const result = stmt.get(userSession, registrationPeriodId) as { count: number };
    return result.count > 0;
  },

  // Get total donated by user
  getTotalDonated: (userSession: string): number => {
    const stmt = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM donations 
      WHERE user_session = ? AND status = 'approved'
    `);
    const result = stmt.get(userSession) as { total: number };
    return result.total;
  },

  // Get top donors
  getTopDonors: (limit: number = 10): { email: string; total: number; count: number }[] => {
    const stmt = db.prepare(`
      SELECT 
        email,
        SUM(amount) as total,
        COUNT(*) as count
      FROM donations 
      WHERE status = 'approved'
      GROUP BY email
      ORDER BY total DESC
      LIMIT ?
    `);
    return stmt.all(limit) as { email: string; total: number; count: number }[];
  },

  // Get total stats
  getStats: (): { total_amount: number; total_donors: number; total_donations: number } => {
    const stmt = db.prepare(`
      SELECT 
        COALESCE(SUM(amount), 0) as total_amount,
        COUNT(DISTINCT email) as total_donors,
        COUNT(*) as total_donations
      FROM donations 
      WHERE status = 'approved'
    `);
    return stmt.get() as { total_amount: number; total_donors: number; total_donations: number };
  },

  updateStatus: (id: number, status: DonationStatus, approvedBy?: string, note?: string) => {
    if (status === 'approved' && approvedBy) {
      const stmt = db.prepare(`
        UPDATE donations 
        SET status = ?, approved_by = ?, approved_at = CURRENT_TIMESTAMP, note = COALESCE(?, note)
        WHERE id = ?
      `);
      return stmt.run(status, approvedBy, note || null, id);
    }
    const stmt = db.prepare(`
      UPDATE donations 
      SET status = ?, note = COALESCE(?, note)
      WHERE id = ?
    `);
    return stmt.run(status, note || null, id);
  },

  delete: (id: number) => {
    const stmt = db.prepare('DELETE FROM donations WHERE id = ?');
    return stmt.run(id);
  }
};

// Database utility functions
export function closeDatabase() {
  if (isProduction) {
    // PostgreSQL connections are managed by Vercel
    return;
  }
  if (db) {
    db.close();
  }
}

export function getDatabase() {
  if (isProduction) {
    // For PostgreSQL, we don't return a database instance
    return null;
  }
  if (!db) {
    initDatabase();
  }
  return db;
}

// Initialize database on import (for server-side usage)
if (typeof window === 'undefined') {
  initDatabase();
}
