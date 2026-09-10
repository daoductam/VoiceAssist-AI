import {
  AudioModule,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { File, UploadTask, UploadType } from 'expo-file-system';
import { APP_CONSTANTS } from '@core/constants';
import * as SecureStore from 'expo-secure-store';

export class SttService {
  private recorder: InstanceType<typeof AudioModule.AudioRecorder> | null = null;

  async requestPermissions(): Promise<boolean> {
    const { granted } = await requestRecordingPermissionsAsync();
    return granted;
  }

  async startRecording(): Promise<void> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Chưa được cấp quyền sử dụng micro.');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    recorder.record();
    this.recorder = recorder;
  }

  async stopRecordingAndTranscribe(): Promise<string> {
    if (!this.recorder) {
      return '';
    }

    await this.recorder.stop();
    const uri = this.recorder.uri;
    this.recorder = null;

    if (!uri) {
      return '';
    }

    // Transcribe with Groq Whisper API
    return this.transcribeWithGroq(uri);
  }

  private async transcribeWithGroq(audioUri: string): Promise<string> {
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

    // Use native UploadTask from expo-file-system to avoid React Native FormData bugs
    try {
      const audioFile = new File(audioUri);
      const uploadTask = new UploadTask(
        audioFile,
        `${APP_CONSTANTS.GROQ_API_URL}/audio/transcriptions`,
        {
          httpMethod: 'POST',
          uploadType: UploadType.MULTIPART,
          fieldName: 'file',
          mimeType: 'audio/m4a',
          parameters: {
            model: APP_CONSTANTS.GROQ_WHISPER_MODEL,
            language: 'vi',
          },
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const result = await uploadTask.uploadAsync();

      if (result.status >= 200 && result.status < 300) {
        const data = JSON.parse(result.body) as { text?: string };
        return data.text ? data.text.trim() : '';
      } else {
        throw new Error(`Lỗi Groq Whisper (${result.status}): ${result.body}`);
      }
    } catch (err: unknown) {
      console.warn('Native UploadTask failed, trying fallback:', err);
      // Fallback: fetch with blob
      try {
        const fileData = await fetch(audioUri);
        const blob = await fileData.blob();

        const formData = new FormData();
        formData.append('file', blob, 'audio.m4a');
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

        if (response.ok) {
          const data = (await response.json()) as { text?: string };
          return data.text ? data.text.trim() : '';
        }
      } catch (fallbackErr) {
        console.warn('Fallback upload also failed:', fallbackErr);
      }

      throw err;
    }
  }

  isRecording(): boolean {
    return this.recorder?.isRecording ?? false;
  }
}

export const sttService = new SttService();
