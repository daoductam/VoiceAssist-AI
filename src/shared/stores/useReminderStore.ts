import { create } from 'zustand';
import { Reminder } from '@domain/entities';
import { reminderService } from '@domain/services/reminder_service';

const isUpcoming = (reminder: Reminder, now = Date.now()) => {
  const remindAt = new Date(reminder.remindAt).getTime();
  return !reminder.isCompleted && Number.isFinite(remindAt) && remindAt > now;
};

const sortByRemindAt = (reminders: Reminder[]) =>
  reminders.sort(
    (a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()
  );

interface ReminderStoreState {
  reminders: Reminder[];
  upcomingReminders: Reminder[];
  loading: boolean;
  error: string | null;

  loadReminders: () => Promise<void>;
  createReminder: (params: {
    title: string;
    remindAt: string;
    repeatInterval?: 'none' | 'daily' | 'weekly' | 'monthly';
    priority?: 'low' | 'medium' | 'high';
  }) => Promise<Reminder>;
  completeReminder: (id: string, isCompleted: boolean) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
}

export const useReminderStore = create<ReminderStoreState>((set, get) => ({
  reminders: [],
  upcomingReminders: [],
  loading: false,
  error: null,

  loadReminders: async () => {
    set({ loading: true, error: null });
    try {
      const [all, upcoming] = await Promise.all([
        reminderService.getAll(),
        reminderService.getUpcoming(),
      ]);
      set({ reminders: all, upcomingReminders: upcoming, loading: false });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải lời nhắc';
      set({ error: errorMsg, loading: false });
    }
  },

  createReminder: async (params) => {
    set({ loading: true, error: null });
    try {
      const newReminder = await reminderService.create(params);
      set((state) => ({
        reminders: [newReminder, ...state.reminders],
        upcomingReminders: sortByRemindAt(
          isUpcoming(newReminder)
            ? [newReminder, ...state.upcomingReminders.filter(isUpcoming)]
            : state.upcomingReminders.filter(isUpcoming)
        ),
        loading: false,
      }));
      return newReminder;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tạo lời nhắc';
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  completeReminder: async (id: string, isCompleted: boolean) => {
    set((state) => {
      const reminder = state.reminders.find((item) => item.id === id);
      const updatedReminder = reminder ? { ...reminder, isCompleted } : undefined;
      const upcoming = state.upcomingReminders.filter(
        (item) => item.id !== id && isUpcoming(item)
      );
      if (updatedReminder && isUpcoming(updatedReminder)) upcoming.push(updatedReminder);

      return {
        reminders: state.reminders.map((item) =>
          item.id === id ? { ...item, isCompleted } : item
        ),
        upcomingReminders: sortByRemindAt(upcoming),
      };
    });
    try {
      await reminderService.complete(id, isCompleted);
    } catch (err: unknown) {
      get().loadReminders();
      throw err;
    }
  },

  deleteReminder: async (id: string) => {
    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
      upcomingReminders: state.upcomingReminders.filter((r) => r.id !== id),
    }));
    try {
      await reminderService.delete(id);
    } catch (err: unknown) {
      get().loadReminders();
      throw err;
    }
  },
}));
