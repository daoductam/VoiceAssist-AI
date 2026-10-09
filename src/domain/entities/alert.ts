export interface AlarmAlert {
  type: 'alarm';
  alarmId?: string;
  label: string;
  time: string;
  spokenText?: string;
  nativeAudio?: boolean;
  occurrenceId?: string;
}

export interface ReminderAlert {
  type: 'reminder';
  reminderId?: string;
  title: string;
  time: string;
  spokenText?: string;
}

export type ActiveAlert = AlarmAlert | ReminderAlert;
export type AlarmAlertInput = Omit<AlarmAlert, 'type'>;
export type ReminderAlertInput = Omit<ReminderAlert, 'type'>;
