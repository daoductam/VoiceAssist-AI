export const APP_CONSTANTS = {
  APP_NAME: 'VoiceAssist AI',
  DEFAULT_LOCALE: 'vi-VN',
  DEFAULT_TIMEZONE: 'Asia/Ho_Chi_Minh',
  SECURE_STORE_KEY_GROQ: 'voiceassist_groq_api_key',
  GROQ_API_URL: 'https://api.groq.com/openai/v1',
  GROQ_WHISPER_MODEL: 'whisper-large-v3',
  GROQ_LLM_MODEL: 'openai/gpt-oss-120b',
  DATABASE_NAME: 'voiceassist.db',
  DEFAULT_SNOOZE_MINUTES: 5,
  MAX_RETRY_ATTEMPTS: 3,
} as const;

export const DAY_LABELS_VN = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;
