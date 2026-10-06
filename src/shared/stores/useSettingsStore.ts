import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { ToneStyle } from '@domain/enums';
import { APP_CONSTANTS } from '@core/constants';

interface SettingsStoreState {
  toneStyle: ToneStyle;
  ttsEnabled: boolean;
  ttsSpeed: number;
  groqApiKey: string;
  isKeyConfigured: boolean;

  loadSettings: () => Promise<void>;
  setToneStyle: (tone: ToneStyle) => Promise<void>;
  setTtsEnabled: (enabled: boolean) => void;
  setTtsSpeed: (speed: number) => void;
  setGroqApiKey: (key: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  toneStyle: 'cute',
  ttsEnabled: true,
  ttsSpeed: 1.0,
  groqApiKey: '',
  isKeyConfigured: false,

  loadSettings: async () => {
    let storedKey: string | null = null;
    let storedToneStyle: string | null = null;
    try {
      storedKey = await SecureStore.getItemAsync(
        APP_CONSTANTS.SECURE_STORE_KEY_GROQ
      );
    } catch {
      // Fall back to the configured environment key.
    }
    try {
      storedToneStyle = await SecureStore.getItemAsync(
        APP_CONSTANTS.SECURE_STORE_KEY_TONE_STYLE
      );
    } catch {
      // Keep the default tone if it cannot be read.
    }

    const effectiveKey = storedKey || process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
    const toneStyle: ToneStyle = storedToneStyle === 'friendly' ||
      storedToneStyle === 'professional' || storedToneStyle === 'cute'
      ? storedToneStyle
      : 'cute';
    set({
      groqApiKey: effectiveKey,
      isKeyConfigured: effectiveKey.trim().length > 0,
      toneStyle,
    });
  },

  setToneStyle: async (tone) => {
    await SecureStore.setItemAsync(APP_CONSTANTS.SECURE_STORE_KEY_TONE_STYLE, tone);
    set({ toneStyle: tone });
  },
  setTtsEnabled: (enabled) => set({ ttsEnabled: enabled }),
  setTtsSpeed: (speed) => set({ ttsSpeed: speed }),

  setGroqApiKey: async (key: string) => {
    try {
      await SecureStore.setItemAsync(
        APP_CONSTANTS.SECURE_STORE_KEY_GROQ,
        key.trim()
      );
      set({
        groqApiKey: key.trim(),
        isKeyConfigured: key.trim().length > 0,
      });
    } catch (err) {
      console.error('Failed to save Groq API Key', err);
    }
  },
}));
