import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

export class TtsService {
  /**
   * Filter out emojis, symbols, and markdown characters before speaking
   * so that TTS doesn't awkwardly read out icon names.
   */
  cleanTextForSpeech(text: string): string {
    if (!text) return '';
    return text
      // Strip emojis and pictographs
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
      // Strip markdown formatting symbols (*, _, #, `, ~)
      .replace(/[*_#`~]/g, '')
      // Clean multiple spaces and trim
      .replace(/\s+/g, ' ')
      .trim();
  }

  async speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      onDone?: () => void;
      onError?: (error: unknown) => void;
    }
  ): Promise<void> {
    const speechText = this.cleanTextForSpeech(text);
    if (!speechText || speechText.trim().length === 0) return;

    // 1. Ensure audio session plays in silent mode on iOS
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch {
      // Ignore
    }

    // 2. Stop previous utterance safely only if currently speaking
    try {
      const isSpeaking = await Speech.isSpeakingAsync();
      if (isSpeaking) {
        await Speech.stop();
        await new Promise((r) => setTimeout(r, 60));
      }
    } catch {
      // Ignore
    }

    return new Promise((resolve) => {
      Speech.speak(speechText, {
        language: 'vi-VN',
        rate: options?.rate ?? 0.95,
        pitch: options?.pitch ?? 1.0,
        onDone: () => {
          options?.onDone?.();
          resolve();
        },
        onError: (err) => {
          console.warn('TTS Speech error:', err);
          options?.onError?.(err);
          resolve();
        },
      });
    });
  }

  async stop(): Promise<void> {
    try {
      await Speech.stop();
    } catch {
      // Ignore
    }
  }

  async isSpeaking(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  }
}

export const ttsService = new TtsService();
