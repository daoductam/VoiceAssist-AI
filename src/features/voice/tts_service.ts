import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';

export class TtsService {
  private currentSpeech: {
    text: string;
    voice: Speech.Voice;
    rate: number;
    pitch: number;
    onDone?: () => void;
    onError?: (error: unknown) => void;
    resolve: () => void;
  } | null = null;
  private nextCharacterIndex = 0;
  private segmentStartIndex = 0;
  private segmentVersion = 0;
  private paused = false;
  private vietnameseVoicePromise: Promise<Speech.Voice> | null = null;

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
    const vietnameseVoice = await this.getVietnameseVoice();

    // 1. Ensure audio session plays in silent mode on iOS
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
      });
    } catch {
      // Ignore
    }

    await this.stop();

    return new Promise((resolve) => {
      this.currentSpeech = {
        text: speechText,
        voice: vietnameseVoice,
        rate: options?.rate ?? 0.95,
        pitch: options?.pitch ?? 1.0,
        onDone: options?.onDone,
        onError: options?.onError,
        resolve,
      };
      this.nextCharacterIndex = 0;
      this.paused = false;
      this.speakFrom(0);
    });
  }

  private getVietnameseVoice(): Promise<Speech.Voice> {
    if (!this.vietnameseVoicePromise) {
      this.vietnameseVoicePromise = Speech.getAvailableVoicesAsync()
        .then((voices) => {
          const vietnameseVoices = voices.filter(
            (voice) => voice.language.split(/[-_]/)[0].toLowerCase() === 'vi'
          );
          const selectedVoice =
            vietnameseVoices.find(
              (voice) => voice.language.toLowerCase() === 'vi-vn'
            ) || vietnameseVoices[0];
          if (!selectedVoice) {
            throw new Error(
              'Thiết bị chưa có giọng đọc tiếng Việt. Hãy cài dữ liệu Giọng nói tiếng Việt trong cài đặt chuyển văn bản thành giọng nói.'
            );
          }
          return selectedVoice;
        })
        .catch((error: unknown) => {
          this.vietnameseVoicePromise = null;
          throw error;
        });
    }
    return this.vietnameseVoicePromise;
  }

  private speakFrom(characterIndex: number): void {
    const speech = this.currentSpeech;
    if (!speech) return;

    const segmentVersion = ++this.segmentVersion;
    this.segmentStartIndex = characterIndex;
    Speech.speak(speech.text.slice(characterIndex), {
      language: speech.voice.language,
      voice: speech.voice.identifier,
      rate: speech.rate,
      pitch: speech.pitch,
      onBoundary: (event: { charIndex: number; charLength: number }) => {
        if (segmentVersion !== this.segmentVersion) return;
        const boundary = event as unknown as { charIndex?: number };
        if (typeof boundary.charIndex === 'number') {
          this.nextCharacterIndex = Math.min(
            speech.text.length,
            this.segmentStartIndex + boundary.charIndex
          );
        }
      },
      onDone: () => this.finishSpeech(segmentVersion, true),
      onStopped: () => {
        if (!this.paused) this.finishSpeech(segmentVersion, false);
      },
      onError: (error) => {
        if (segmentVersion !== this.segmentVersion) return;
        speech.onError?.(error);
        this.finishSpeech(segmentVersion, false);
      },
    });
  }

  private finishSpeech(segmentVersion: number, completed: boolean): void {
    if (segmentVersion !== this.segmentVersion || !this.currentSpeech) return;
    const speech = this.currentSpeech;
    this.currentSpeech = null;
    this.paused = false;
    if (completed) speech.onDone?.();
    speech.resolve();
  }

  async pause(): Promise<void> {
    if (!this.currentSpeech || this.paused) return;
    this.paused = true;
    if (Platform.OS === 'ios' || Platform.OS === 'web') {
      try {
        await Speech.pause();
        return;
      } catch {
        // Fall back to restarting from the next word boundary.
      }
    }

    this.segmentVersion += 1;
    await Speech.stop();
  }

  async resume(): Promise<void> {
    if (!this.currentSpeech || !this.paused) return;
    if (Platform.OS === 'ios' || Platform.OS === 'web') {
      try {
        await Speech.resume();
        this.paused = false;
        return;
      } catch {
        // Fall back to restarting from the last known word boundary.
      }
    }

    this.paused = false;
    this.speakFrom(this.nextCharacterIndex);
  }

  isPaused(): boolean {
    return this.paused;
  }

  async stop(): Promise<void> {
    const speech = this.currentSpeech;
    this.currentSpeech = null;
    this.paused = false;
    this.segmentVersion += 1;
    try {
      await Speech.stop();
    } catch {
      // Ignore
    }
    speech?.resolve();
  }

  async isSpeaking(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  }
}

export const ttsService = new TtsService();
