export type IntentType =
  | 'setAlarm'
  | 'setReminder'
  | 'addTodo'
  | 'editTodo'
  | 'querySchedule'
  | 'generalQa'
  | 'unknown';

export type ToneStyle = 'friendly' | 'professional' | 'cute';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';
