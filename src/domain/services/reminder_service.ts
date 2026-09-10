import { Reminder } from '@domain/entities';
import { reminderDao } from '@data/daos/reminder_dao';
import { ValidationException, NotFoundException } from '@core/exceptions/app_exception';

export class ReminderService {
  async getAll(): Promise<Reminder[]> {
    return reminderDao.getAll();
  }

  async getUpcoming(limit: number = 10): Promise<Reminder[]> {
    return reminderDao.getUpcoming(limit);
  }

  async create(params: {
    title: string;
    remindAt: string; // ISO8601
    repeatInterval?: 'none' | 'daily' | 'weekly' | 'monthly';
    priority?: 'low' | 'medium' | 'high';
  }): Promise<Reminder> {
    if (!params.title || params.title.trim().length === 0) {
      throw new ValidationException('Tiêu đề lời nhắc không được để trống.');
    }

    const remindDate = new Date(params.remindAt);
    if (isNaN(remindDate.getTime())) {
      throw new ValidationException(`Thời gian nhắc không hợp lệ: "${params.remindAt}"`);
    }

    const nowIso = new Date().toISOString();
    const newReminder: Reminder = {
      id: `reminder_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: params.title.trim(),
      remindAt: params.remindAt,
      isCompleted: false,
      repeatInterval: params.repeatInterval || 'none',
      priority: params.priority || 'medium',
      createdAt: nowIso,
      updatedAt: nowIso,
      syncStatus: 'pending',
    };

    await reminderDao.insert(newReminder);
    return newReminder;
  }

  async complete(id: string, isCompleted: boolean = true): Promise<void> {
    await reminderDao.toggleComplete(id, isCompleted);
  }

  async delete(id: string): Promise<void> {
    await reminderDao.delete(id);
  }
}

export const reminderService = new ReminderService();
