import { Alarm } from '@domain/entities';
import { alarmDao } from '@data/daos/alarm_dao';
import { NotFoundException, ValidationException } from '@core/exceptions/app_exception';
import { notificationService } from '@domain/services/notification_service';

export class AlarmService {
  async getAll(): Promise<Alarm[]> {
    return alarmDao.getAll();
  }

  async getById(id: string): Promise<Alarm> {
    const alarm = await alarmDao.getById(id);
    if (!alarm) {
      throw new NotFoundException('Báo thức', id);
    }
    return alarm;
  }

  async create(params: {
    time: string;
    label?: string;
    repeatDays?: number[];
    vibrate?: boolean;
    ringtoneUri?: string;
  }): Promise<Alarm> {
    // Validate time format: "HH:mm"
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(params.time)) {
      throw new ValidationException(
        'Giờ báo thức không hợp lệ. Vui lòng dùng định dạng HH:mm.'
      );
    }

    const nowIso = new Date().toISOString();
    const newAlarm: Alarm = {
      id: `alarm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      time: params.time,
      label: params.label && params.label.trim() ? params.label.trim() : 'Báo thức',
      isActive: true,
      repeatDays: params.repeatDays || [],
      vibrate: params.vibrate ?? true,
      ringtoneUri: params.ringtoneUri,
      snoozeCount: 0,
      snoozeDuration: 5,
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: 'pending',
    };

    await alarmDao.insert(newAlarm);

    // A single scheduler owns delivery on each platform.
    if (newAlarm.isActive) {
      try {
        await notificationService.scheduleAlarm(newAlarm);
      } catch (err) {
        await alarmDao.delete(newAlarm.id);
        throw err;
      }
    }

    return newAlarm;
  }

  async update(
    id: string,
    params: {
      time?: string;
      label?: string;
      repeatDays?: number[];
      vibrate?: boolean;
      ringtoneUri?: string;
    }
  ): Promise<Alarm> {
    const alarm = await this.getById(id);

    const time = params.time ?? alarm.time;
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) {
      throw new ValidationException(
        'Giờ báo thức không hợp lệ. Vui lòng dùng định dạng HH:mm.'
      );
    }

    const repeatDays =
      params.repeatDays !== undefined ? params.repeatDays : alarm.repeatDays;

    if (repeatDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new ValidationException('Ngày lặp lại không hợp lệ.');
    }

    if (repeatDays.length === 0 && params.time !== undefined) {
      const [hour, minute] = time.split(':').map(Number);
      const target = new Date();
      target.setHours(hour, minute, 0, 0);
      if (target.getTime() <= Date.now() + 5000) {
        throw new ValidationException(
          'Thời gian báo thức đã qua. Vui lòng chọn thời gian khác.'
        );
      }
    }

    const updatedAlarm: Alarm = {
      ...alarm,
      time,
      label:
        params.label !== undefined
          ? params.label.trim() || alarm.label
          : alarm.label,
      repeatDays,
      vibrate: params.vibrate !== undefined ? params.vibrate : alarm.vibrate,
      ringtoneUri:
        params.ringtoneUri !== undefined
          ? params.ringtoneUri
          : alarm.ringtoneUri,
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
    };

    await alarmDao.update(updatedAlarm);
    try {
      if (updatedAlarm.isActive) {
        await notificationService.scheduleAlarm(updatedAlarm);
      } else {
        await notificationService.cancel(id);
      }
    } catch (error) {
      await alarmDao.update(alarm);
      if (alarm.isActive) {
        await notificationService.scheduleAlarm(alarm).catch(() => undefined);
      }
      throw error;
    }

    return updatedAlarm;
  }

  /**
   * Checks whether a one-time alarm has already passed its single scheduled trigger date.
   */
  isOneTimeAlarmExpired(alarm: Alarm, now: Date = new Date()): boolean {
    if (alarm.repeatDays && alarm.repeatDays.length > 0) {
      return false; // Recurring alarms do not expire
    }

    const [hourStr, minuteStr] = alarm.time.split(':');
    const hour = Number.parseInt(hourStr || '0', 10);
    const minute = Number.parseInt(minuteStr || '0', 10);

    const baseDate = new Date(alarm.updatedAt || alarm.createdAt);
    const validBase = !Number.isNaN(baseDate.getTime()) ? baseDate : now;

    const targetDate = new Date(validBase);
    targetDate.setHours(hour, minute, 0, 0);

    // If target was earlier than or equal to activation time, it was set for the next day
    if (targetDate.getTime() <= validBase.getTime()) {
      targetDate.setDate(targetDate.getDate() + 1);
    }

    // Expired if current time is past the target time (with 30s grace period for ringing)
    return now.getTime() > targetDate.getTime() + 30_000;
  }

  /**
   * Deactivates an alarm if it is a non-repeating (one-time) alarm.
   * Returns true if deactivated, false otherwise.
   */
  async deactivateIfOneTime(id: string): Promise<boolean> {
    try {
      const alarm = await this.getById(id);
      if (alarm.isActive && (!alarm.repeatDays || alarm.repeatDays.length === 0)) {
        await this.toggle(id, false);
        return true;
      }
    } catch (err) {
      console.warn(`Could not deactivate one-time alarm ${id}:`, err);
    }
    return false;
  }

  async toggle(id: string, isActive: boolean): Promise<void> {
    const alarm = await this.getById(id);
    if (isActive) {
      await notificationService.scheduleAlarm({ ...alarm, isActive: true });
    } else {
      await notificationService.cancel(id);
    }
    await alarmDao.toggleActive(id, isActive);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await notificationService.cancel(id);
    await alarmDao.delete(id);
  }

  /**
   * Resync all active alarms into expo-notifications and native AlarmManager on app startup or reload.
   * Automatically deactivates any one-time alarms whose single trigger time has already passed.
   */
  async syncAllActiveAlarms(): Promise<void> {
    try {
      const alarms = await this.getAll();
      const now = new Date();
      for (const alarm of alarms) {
        if (alarm.isActive) {
          if (this.isOneTimeAlarmExpired(alarm, now)) {
            await this.toggle(alarm.id, false);
          } else {
            await notificationService.scheduleAlarm(alarm);
          }
        } else {
          await notificationService.cancel(alarm.id);
        }
      }
    } catch (err) {
      console.warn('Failed to sync active alarms:', err);
    }
  }
}

export const alarmService = new AlarmService();

