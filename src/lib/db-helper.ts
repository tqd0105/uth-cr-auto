import { sql } from '@vercel/postgres';

// Helper function to use appropriate database functions
export function useDatabase() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Use PostgreSQL functions
    const dbPostgres = require('./db-postgres');
    return {
      ...dbPostgres,
      isPostgreSQL: true,
      isSQLite: false
    };
  } else {
    // Use SQLite functions
    const dbSQLite = require('./db');
    return {
      ...dbSQLite,
      isPostgreSQL: false,
      isSQLite: true
    };
  }
}

// Helper to execute queries safely
export async function executeQuery(sqlQuery: string, params: any[] = []) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (isProduction) {
    // Use Vercel Postgres
    if (params.length > 0) {
      return await sql.query(sqlQuery, params);
    } else {
      return await sql.query(sqlQuery);
    }
  } else {
    // Use SQLite
    const { getDatabase } = require('./db');
    const db = getDatabase();
    if (params.length > 0) {
      return db.prepare(sqlQuery).all(...params);
    } else {
      return db.prepare(sqlQuery).all();
    }
  }
}
