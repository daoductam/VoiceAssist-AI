import { create } from 'zustand';
import { Alarm } from '@domain/entities';
import { alarmService } from '@domain/services/alarm_service';

export interface RingingAlarmState {
  visible: boolean;
  type: 'alarm' | 'reminder';
  id?: string;
  label: string;
  time: string;
  spokenText?: string;
}

interface AlarmStoreState {
  alarms: Alarm[];
  loading: boolean;
  error: string | null;

  ringingAlarm: RingingAlarmState;
  openRingingAlarm: (params?: {
    type?: 'alarm' | 'reminder';
    id?: string;
    label?: string;
    time?: string;
    spokenText?: string;
  }) => void;
  closeRingingAlarm: () => void;

  loadAlarms: () => Promise<void>;
  createAlarm: (params: {
    time: string;
    label?: string;
    repeatDays?: number[];
    vibrate?: boolean;
    ringtoneUri?: string;
  }) => Promise<Alarm>;
  toggleAlarm: (id: string, isActive: boolean) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
}

export const useAlarmStore = create<AlarmStoreState>((set, get) => ({
  alarms: [],
  loading: false,
  error: null,

  ringingAlarm: {
    visible: false,
    type: 'alarm',
    label: 'Báo thức buổi sáng',
    time: '06:30',
  },

  openRingingAlarm: (params) => {
    set({
      ringingAlarm: {
        visible: true,
        type: params?.type || 'alarm',
        id: params?.id,
        label: params?.label || (params?.type === 'reminder' ? 'Lời nhắc nhở' : 'Báo thức'),
        time:
          params?.time ||
          new Date().toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
          }),
        spokenText: params?.spokenText,
      },
    });
  },

  closeRingingAlarm: () => {
    set((state) => ({
      ringingAlarm: { ...state.ringingAlarm, visible: false },
    }));
  },

  loadAlarms: async () => {
    set({ loading: true, error: null });
    try {
      const alarms = await alarmService.getAll();
      set({ alarms, loading: false });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tải báo thức';
      set({ error: errorMsg, loading: false });
    }
  },

  createAlarm: async (params) => {
    set({ loading: true, error: null });
    try {
      const newAlarm = await alarmService.create(params);
      set((state) => ({
        alarms: [...state.alarms, newAlarm].sort((a, b) =>
          a.time.localeCompare(b.time)
        ),
        loading: false,
      }));
      return newAlarm;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Lỗi khi tạo báo thức';
      set({ error: errorMsg, loading: false });
      throw err;
    }
  },

  toggleAlarm: async (id: string, isActive: boolean) => {
    // Optimistic UI update
    set((state) => ({
      alarms: state.alarms.map((a) => (a.id === id ? { ...a, isActive } : a)),
    }));
    try {
      await alarmService.toggle(id, isActive);
    } catch (err: unknown) {
      // Revert on error
      get().loadAlarms();
      throw err;
    }
  },

  deleteAlarm: async (id: string) => {
    // Optimistic UI update
    set((state) => ({
      alarms: state.alarms.filter((a) => a.id !== id),
    }));
    try {
      await alarmService.delete(id);
    } catch (err: unknown) {
      get().loadAlarms();
      throw err;
    }
  },
}));
