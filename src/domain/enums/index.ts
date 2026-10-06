export type IntentType =
  | 'setAlarm'
  | 'cancelAlarm'
  | 'setReminder'
  | 'addTodo'
  | 'completeTodo'
  | 'editTodo'
  | 'querySchedule'
  | 'generalQa'
  | 'unknown';

export type ToneStyle = 'friendly' | 'professional' | 'cute';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export type VoiceOrbState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'paused' | 'error';
