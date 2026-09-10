import { Alarm } from '@domain/entities';
import { alarmDao } from '@data/daos/alarm_dao';
import { ValidationException, NotFoundException } from '@core/exceptions/app_exception';
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
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(params.time)) {
      throw new ValidationException(
        `Định dạng giờ không hợp lệ: "${params.time}". Cần có dạng HH:mm (00:00 - 23:59).`
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

    // Automatically schedule local notification
    if (newAlarm.isActive) {
      try {
        await notificationService.scheduleAlarm(newAlarm);
      } catch (err) {
        console.warn('Failed to schedule alarm notification:', err);
      }
    }

    return newAlarm;
  }

  async toggle(id: string, isActive: boolean): Promise<void> {
    const alarm = await this.getById(id);
    await alarmDao.toggleActive(id, isActive);

    if (isActive) {
      try {
        await notificationService.scheduleAlarm({ ...alarm, isActive: true });
      } catch (err) {
        console.warn('Failed to schedule alarm notification on toggle:', err);
      }
    } else {
      try {
        await notificationService.cancel(id);
      } catch (err) {
        console.warn('Failed to cancel alarm notification on toggle:', err);
      }
    }
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await alarmDao.delete(id);
    try {
      await notificationService.cancel(id);
    } catch (err) {
      console.warn('Failed to cancel alarm notification on delete:', err);
    }
  }

  /**
   * Resync all active alarms into expo-notifications on app startup or reload
   */
  async syncAllActiveAlarms(): Promise<void> {
    try {
      const alarms = await this.getAll();
      for (const alarm of alarms) {
        if (alarm.isActive) {
          await notificationService.scheduleAlarm(alarm);
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

