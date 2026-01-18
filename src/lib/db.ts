import Database from 'better-sqlite3';
import path from 'path';
import { RegistrationSchedule, RegistrationLog, UserConfig, RegistrationStatus } from './types/uth';

const DB_PATH = path.join(process.cwd(), 'data', 'uth-cr-auto.db');

// Initialize database
let db: Database.Database;

export function initDatabase() {
  try {
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

// Database utility functions
export function closeDatabase() {
  if (db) {
    db.close();
  }
}

export function getDatabase() {
  if (!db) {
    initDatabase();
  }
  return db;
}

// Initialize database on import (for server-side usage)
if (typeof window === 'undefined') {
  initDatabase();
}