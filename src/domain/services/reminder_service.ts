import { Reminder } from '@domain/entities';
import { reminderDao } from '@data/daos/reminder_dao';
import { ValidationException, NotFoundException } from '@core/exceptions/app_exception';
import { notificationService } from '@domain/services/notification_service';

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

    if (!newReminder.isCompleted) {
      try {
        await notificationService.scheduleReminder(newReminder);
      } catch (err) {
        console.warn('Failed to schedule reminder notification:', err);
      }
    }

    return newReminder;
  }

  async complete(id: string, isCompleted: boolean = true): Promise<void> {
    await reminderDao.toggleComplete(id, isCompleted);
    if (isCompleted) {
      try {
        await notificationService.cancel(id);
      } catch (err) {
        console.warn('Failed to cancel reminder notification on complete:', err);
      }
    } else {
      try {
        const rem = await reminderDao.getById(id);
        if (rem) {
          await notificationService.scheduleReminder(rem);
        }
      } catch (err) {
        console.warn('Failed to reschedule reminder notification on uncomplete:', err);
      }
    }
  }

  async delete(id: string): Promise<void> {
    await reminderDao.delete(id);
    try {
      await notificationService.cancel(id);
    } catch (err) {
      console.warn('Failed to cancel reminder notification on delete:', err);
    }
  }

  /**
   * Resync all active reminders into expo-notifications on app startup
   */
  async syncAllActiveReminders(): Promise<void> {
    try {
      const reminders = await this.getAll();
      for (const rem of reminders) {
        if (!rem.isCompleted && new Date(rem.remindAt).getTime() > Date.now()) {
          await notificationService.scheduleReminder(rem);
        } else {
          await notificationService.cancel(rem.id);
        }
      }
    } catch (err) {
      console.warn('Failed to sync active reminders:', err);
    }
  }
}

export const reminderService = new ReminderService();
