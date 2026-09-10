import * as Speech from 'expo-speech';

export class TtsService {
  async speak(
    text: string,
    options?: {
      rate?: number;
      pitch?: number;
      onDone?: () => void;
      onError?: (error: unknown) => void;
    }
  ): Promise<void> {
    if (!text || text.trim().length === 0) return;

    // Stop previous utterance if any
    await this.stop();

    return new Promise((resolve) => {
      Speech.speak(text, {
        language: 'vi-VN',
        rate: options?.rate ?? 1.0,
        pitch: options?.pitch ?? 1.0,
        onDone: () => {
          options?.onDone?.();
          resolve();
        },
        onError: (err) => {
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
