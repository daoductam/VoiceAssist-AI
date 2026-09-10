import * as SQLite from 'expo-sqlite';
import { APP_CONSTANTS } from '@core/constants';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await SQLite.openDatabaseAsync(APP_CONSTANTS.DATABASE_NAME);
  await initializeDatabase(dbInstance);
  return dbInstance;
}

async function initializeDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      time TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      repeat_days TEXT NOT NULL DEFAULT '[]',
      ringtone_uri TEXT,
      vibrate INTEGER NOT NULL DEFAULT 1,
      snooze_count INTEGER NOT NULL DEFAULT 0,
      snooze_duration INTEGER NOT NULL DEFAULT 5,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      remind_at TEXT NOT NULL,
      is_completed INTEGER NOT NULL DEFAULT 0,
      repeat_interval TEXT NOT NULL DEFAULT 'none',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      is_done INTEGER NOT NULL DEFAULT 0,
      due_date TEXT,
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE TABLE IF NOT EXISTS conversation_logs (
      id TEXT PRIMARY KEY,
      user_input TEXT NOT NULL,
      detected_intent TEXT NOT NULL,
      entities_json TEXT,
      ai_response TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      is_offline INTEGER NOT NULL DEFAULT 0
    );
  `);
}
