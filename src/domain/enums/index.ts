export type IntentType =
  | 'setAlarm'
  | 'setReminder'
  | 'addTodo'
  | 'querySchedule'
  | 'generalQa'
  | 'unknown';

export type ToneStyle = 'friendly' | 'professional' | 'cute';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
