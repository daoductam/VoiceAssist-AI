import { getDatabase } from '../database';
import { Reminder } from '@domain/entities';

interface ReminderRow {
  id: string;
  title: string;
  remind_at: string;
  is_completed: number;
  repeat_interval: 'none' | 'daily' | 'weekly' | 'monthly';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

function mapRowToReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    title: row.title,
    remindAt: row.remind_at,
    isCompleted: row.is_completed === 1,
    repeatInterval: row.repeat_interval,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export class ReminderDao {
  async getAll(): Promise<Reminder[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ReminderRow>(
      'SELECT * FROM reminders ORDER BY remind_at ASC;'
    );
    return rows.map(mapRowToReminder);
  }

  async getById(id: string): Promise<Reminder | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ReminderRow>(
      'SELECT * FROM reminders WHERE id = ?;',
      [id]
    );
    return row ? mapRowToReminder(row) : null;
  }

  async getUpcoming(limit: number = 10): Promise<Reminder[]> {
    const db = await getDatabase();
    const nowIso = new Date().toISOString();
    const rows = await db.getAllAsync<ReminderRow>(
      'SELECT * FROM reminders WHERE is_completed = 0 AND remind_at >= ? ORDER BY remind_at ASC LIMIT ?;',
      [nowIso, limit]
    );
    return rows.map(mapRowToReminder);
  }

  async insert(reminder: Reminder): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO reminders (
        id, title, remind_at, is_completed, repeat_interval,
        priority, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        reminder.id,
        reminder.title,
        reminder.remindAt,
        reminder.isCompleted ? 1 : 0,
        reminder.repeatInterval || 'none',
        reminder.priority,
        reminder.createdAt,
        reminder.updatedAt,
        reminder.syncStatus,
      ]
    );
  }

  async update(reminder: Reminder): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE reminders SET
        title = ?, remind_at = ?, is_completed = ?,
        repeat_interval = ?, priority = ?, updated_at = ?, sync_status = ?
      WHERE id = ?;`,
      [
        reminder.title,
        reminder.remindAt,
        reminder.isCompleted ? 1 : 0,
        reminder.repeatInterval || 'none',
        reminder.priority,
        reminder.updatedAt,
        reminder.syncStatus,
        reminder.id,
      ]
    );
  }

  async toggleComplete(id: string, isCompleted: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE reminders SET is_completed = ?, updated_at = ? WHERE id = ?;',
      [isCompleted ? 1 : 0, new Date().toISOString(), id]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM reminders WHERE id = ?;', [id]);
  }
}

export const reminderDao = new ReminderDao();
