import { getDatabase } from '../database';
import { Alarm } from '@domain/entities';

interface AlarmRow {
  id: string;
  label: string;
  time: string;
  is_active: number;
  repeat_days: string;
  ringtone_uri: string | null;
  vibrate: number;
  snooze_count: number;
  snooze_duration: number;
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

function mapRowToAlarm(row: AlarmRow): Alarm {
  return {
    id: row.id,
    label: row.label,
    time: row.time,
    isActive: row.is_active === 1,
    repeatDays: JSON.parse(row.repeat_days || '[]'),
    ringtoneUri: row.ringtone_uri || undefined,
    vibrate: row.vibrate === 1,
    snoozeCount: row.snooze_count,
    snoozeDuration: row.snooze_duration,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
  };
}

export class AlarmDao {
  async getAll(): Promise<Alarm[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<AlarmRow>(
      'SELECT * FROM alarms ORDER BY time ASC;'
    );
    return rows.map(mapRowToAlarm);
  }

  async getById(id: string): Promise<Alarm | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<AlarmRow>(
      'SELECT * FROM alarms WHERE id = ?;',
      [id]
    );
    return row ? mapRowToAlarm(row) : null;
  }

  async insert(alarm: Alarm): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO alarms (
        id, label, time, is_active, repeat_days, ringtone_uri,
        vibrate, snooze_count, snooze_duration, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        alarm.id,
        alarm.label,
        alarm.time,
        alarm.isActive ? 1 : 0,
        JSON.stringify(alarm.repeatDays),
        alarm.ringtoneUri || null,
        alarm.vibrate ? 1 : 0,
        alarm.snoozeCount,
        alarm.snoozeDuration,
        alarm.createdAt,
        alarm.updatedAt,
        alarm.syncStatus,
      ]
    );
  }

  async update(alarm: Alarm): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE alarms SET
        label = ?, time = ?, is_active = ?, repeat_days = ?,
        ringtone_uri = ?, vibrate = ?, snooze_count = ?,
        snooze_duration = ?, updated_at = ?, sync_status = ?
      WHERE id = ?;`,
      [
        alarm.label,
        alarm.time,
        alarm.isActive ? 1 : 0,
        JSON.stringify(alarm.repeatDays),
        alarm.ringtoneUri || null,
        alarm.vibrate ? 1 : 0,
        alarm.snoozeCount,
        alarm.snoozeDuration,
        alarm.updatedAt,
        alarm.syncStatus,
        alarm.id,
      ]
    );
  }

  async toggleActive(id: string, isActive: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE alarms SET is_active = ?, updated_at = ? WHERE id = ?;',
      [isActive ? 1 : 0, new Date().toISOString(), id]
    );
  }

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM alarms WHERE id = ?;', [id]);
  }
}

export const alarmDao = new AlarmDao();
