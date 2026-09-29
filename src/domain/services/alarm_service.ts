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

  async update(id: string, params: { time: string; label?: string }): Promise<Alarm> {
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(params.time)) {
      throw new ValidationException(
        'Giờ báo thức không hợp lệ. Vui lòng dùng định dạng HH:mm.'
      );
    }

    const alarm = await this.getById(id);
    if (alarm.repeatDays.length === 0) {
      const [hour, minute] = params.time.split(':').map(Number);
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
      time: params.time,
      label: params.label?.trim() || alarm.label,
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
   * Resync all active alarms into expo-notifications and native AlarmManager on app startup or reload
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
