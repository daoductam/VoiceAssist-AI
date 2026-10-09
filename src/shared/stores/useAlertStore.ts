import { create } from 'zustand';
import {
  ActiveAlert,
  AlarmAlertInput,
  ReminderAlertInput,
} from '@domain/entities';

interface AlertStoreState {
  activeAlert: ActiveAlert | null;
  openAlarm: (params: AlarmAlertInput) => void;
  openReminder: (params: ReminderAlertInput) => void;
  closeAlert: () => void;
  isSameActiveAlert: (alert: ActiveAlert) => boolean;
}

const getCurrentTime = (): string =>
  new Date().toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

const isSameAlert = (
  current: ActiveAlert | null,
  incoming: ActiveAlert
): boolean => {
  if (!current || current.type !== incoming.type) return false;

  if (current.type === 'alarm' && incoming.type === 'alarm') {
    if (current.occurrenceId && incoming.occurrenceId) {
      return current.occurrenceId === incoming.occurrenceId;
    }
    return Boolean(current.alarmId && incoming.alarmId) &&
      current.alarmId === incoming.alarmId;
  }

  if (current.type === 'reminder' && incoming.type === 'reminder') {
    if (current.reminderId && incoming.reminderId) {
      return current.reminderId === incoming.reminderId;
    }
    return current.title === incoming.title && current.time === incoming.time;
  }

  return false;
};

export const useAlertStore = create<AlertStoreState>((set, get) => ({
  activeAlert: null,

  openAlarm: (params) => {
    const alert: ActiveAlert = {
      type: 'alarm',
      label: params.label || 'Báo thức',
      time: params.time || getCurrentTime(),
      alarmId: params.alarmId,
      spokenText: params.spokenText,
      nativeAudio: params.nativeAudio ?? false,
      occurrenceId: params.occurrenceId,
    };
    if (isSameAlert(get().activeAlert, alert)) return;
    set({ activeAlert: alert });
  },

  openReminder: (params) => {
    const alert: ActiveAlert = {
      type: 'reminder',
      title: params.title || 'Lời nhắc nhở',
      time: params.time || getCurrentTime(),
      reminderId: params.reminderId,
      spokenText: params.spokenText,
    };
    if (isSameAlert(get().activeAlert, alert)) return;
    set({ activeAlert: alert });
  },

  closeAlert: () => set({ activeAlert: null }),

  isSameActiveAlert: (alert) => isSameAlert(get().activeAlert, alert),
}));
