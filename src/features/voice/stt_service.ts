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

  async startRecording(signal?: AbortSignal): Promise<void> {
    const hasPermission = await this.requestPermissions();
    this.throwIfAborted(signal);
    if (!hasPermission) {
      throw new Error('Chưa được cấp quyền sử dụng micro.');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });
    this.throwIfAborted(signal);

    const recorder = new AudioModule.AudioRecorder(RecordingPresets.HIGH_QUALITY);
    await recorder.prepareToRecordAsync();
    if (signal?.aborted) {
      await recorder.stop().catch(() => undefined);
      this.throwIfAborted(signal);
    }
    recorder.record();
    this.recorder = recorder;
  }

  async cancelRecording(): Promise<void> {
    const recorder = this.recorder;
    this.recorder = null;
    if (!recorder) return;
    try {
      await recorder.stop();
    } catch {
      // The recorder may already have stopped while transcription began.
    }
  }

  async stopRecordingAndTranscribe(signal?: AbortSignal): Promise<string> {
    this.throwIfAborted(signal);
    if (!this.recorder) {
      return '';
    }

    const recorder = this.recorder;
    this.recorder = null;
    await recorder.stop();
    this.throwIfAborted(signal);
    const uri = recorder.uri;

    if (!uri) {
      return '';
    }

    // Transcribe with Groq Whisper API
    return this.transcribeWithGroq(uri, signal);
  }

  private async transcribeWithGroq(audioUri: string, signal?: AbortSignal): Promise<string> {
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
          signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      const result = await uploadTask.uploadAsync();

      if (result.status >= 200 && result.status < 300) {
        this.throwIfAborted(signal);
        const data = JSON.parse(result.body) as { text?: string };
        return data.text ? data.text.trim() : '';
      } else {
        throw new Error(`Lỗi Groq Whisper (${result.status}): ${result.body}`);
      }
    } catch (err: unknown) {
      this.throwIfAborted(signal);
      console.warn('Native UploadTask failed, trying fallback:', err);
      // Fallback: fetch with blob
      try {
        const fileData = await fetch(audioUri, { signal });
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
            signal,
          }
        );

        if (response.ok) {
          this.throwIfAborted(signal);
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

  private throwIfAborted(signal?: AbortSignal): void {
    if (!signal?.aborted) return;
    const error = new Error('Yêu cầu đã bị hủy.');
    error.name = 'AbortError';
    throw error;
  }
}

export const sttService = new SttService();
