import { Alarm } from '@domain/entities';
import { alarmDao } from '@data/daos/alarm_dao';
import { ValidationException, NotFoundException } from '@core/exceptions/app_exception';

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
    return newAlarm;
  }

  async toggle(id: string, isActive: boolean): Promise<void> {
    await this.getById(id);
    await alarmDao.toggleActive(id, isActive);
  }

  async delete(id: string): Promise<void> {
    await this.getById(id);
    await alarmDao.delete(id);
  }
}

export const alarmService = new AlarmService();
