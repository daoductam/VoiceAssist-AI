import { SyncStatus, ToneStyle } from '../enums';

export interface Alarm {
  id: string;
  label: string;
  time: string;           // "HH:mm" 24h format e.g. "06:30"
  isActive: boolean;
  repeatDays: number[];   // 0=Mon, 1=Tue, ..., 6=Sun
  ringtoneUri?: string;
  vibrate: boolean;
  snoozeCount: number;
  snoozeDuration: number; // minutes
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface Reminder {
  id: string;
  title: string;
  remindAt: string;       // ISO8601 string
  isCompleted: boolean;
  repeatInterval?: 'none' | 'daily' | 'weekly' | 'monthly';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface Todo {
  id: string;
  title: string;
  isDone: boolean;
  dueDate?: string;       // ISO8601 or YYYY-MM-DD
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface ConversationLog {
  id: string;
  userInput: string;
  detectedIntent: string;
  entitiesJson?: string;
  aiResponse: string;
  timestamp: string;
  isOffline: boolean;
}

export interface UserSettings {
  toneStyle: ToneStyle;
  ttsEnabled: boolean;
  ttsSpeed: number;
  ttsPitch: number;
  groqApiKey?: string;
  theme: 'dark' | 'light' | 'system';
}
