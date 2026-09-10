import { Audio } from 'expo-av';
import { APP_CONSTANTS } from '@core/constants';
import * as SecureStore from 'expo-secure-store';

export class SttService {
  private recording: Audio.Recording | null = null;

  async requestPermissions(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async startRecording(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Chưa được cấp quyền sử dụng micro.');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    await recording.startAsync();
    this.recording = recording;
  }

  async stopRecordingAndTranscribe(): Promise<string> {
    if (!this.recording) {
      return '';
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    if (!uri) {
      return '';
    }

    // Transcribe with Groq Whisper API
    return this.transcribeWithGroq(uri);
  }

  private async transcribeWithGroq(audioUri: string): Promise<string> {
    // 1. Get Groq API Key from secure store or environment
    let apiKey = process.env.EXPO_PUBLIC_GROQ_API_KEY;
    try {
      const storedKey = await SecureStore.getItemAsync(
        APP_CONSTANTS.SECURE_STORE_KEY_GROQ
      );
      if (storedKey && storedKey.trim().length > 0) {
        apiKey = storedKey.trim();
      }
    } catch {
      // Fallback to env
    }

    if (!apiKey) {
      throw new Error('Không tìm thấy Groq API Key để nhận diện giọng nói.');
    }

    // 2. Prepare FormData
    const formData = new FormData();
    const filename = audioUri.split('/').pop() || 'recording.m4a';

    // In React Native, FormData expects { uri, name, type }
    // @ts-expect-error React Native multipart file representation
    formData.append('file', {
      uri: audioUri,
      name: filename,
      type: 'audio/m4a',
    });
    formData.append('model', APP_CONSTANTS.GROQ_WHISPER_MODEL);
    formData.append('language', 'vi');

    const response = await fetch(
      `${APP_CONSTANTS.GROQ_API_URL}/audio/transcriptions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Lỗi Groq Whisper (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as { text?: string };
    return data.text ? data.text.trim() : '';
  }

  isRecording(): boolean {
    return this.recording !== null;
  }
}

export const sttService = new SttService();
