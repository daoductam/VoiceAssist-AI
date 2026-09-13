import { Alert, NativeEventEmitter, NativeModules, Platform } from 'react-native';

export interface NativeAlarmPayload {
  id: string;
  label: string;
  time: string;
  spokenText: string;
  occurrenceId: string;
}

interface AlarmCapabilities {
  available: boolean;
  exactAlarm: boolean;
  fullScreen: boolean;
  notifications: boolean;
}

interface ScheduleParams {
  id: string;
  triggerDate: Date;
  label: string;
  timeStr: string;
  spokenText?: string;
  repeatDays?: number[];
  vibrate?: boolean;
}

const { AndroidAlarmModule } = NativeModules;

export class AlarmPermissionError extends Error {}

export class NativeAlarmBridge {
  static get available(): boolean {
    return Platform.OS === 'android' && typeof AndroidAlarmModule?.getCapabilities === 'function';
  }

  static async ensureReady(): Promise<void> {
    if (!this.available) {
      throw new Error('Bản ứng dụng này chưa có báo thức nền. Hãy cài APK mới; Expo Go không hỗ trợ chức năng này.');
    }
    const capabilities: AlarmCapabilities = await AndroidAlarmModule.getCapabilities();
    const missing = (['notifications', 'exactAlarm', 'fullScreen'] as const)
      .find(permission => !capabilities[permission]);
    if (!missing) return;
    const names = {
      notifications: 'thông báo báo thức (mức ưu tiên cao)',
      exactAlarm: 'báo thức và lời nhắc chính xác',
      fullScreen: 'thông báo toàn màn hình',
    };
    const message = `Hãy cho phép ${names[missing]} trong Cài đặt, rồi quay lại đặt chuông.`;
    Alert.alert('Cần quyền báo thức', message, [
      { text: 'Để sau', style: 'cancel' },
      { text: 'Mở cài đặt', onPress: () => {
        AndroidAlarmModule.openPermissionSettings(missing).catch(() => {
          Alert.alert('Không mở được cài đặt', 'Hãy mở Cài đặt hệ thống → Ứng dụng → VoiceAssist AI.');
        });
      } },
    ]);
    throw new AlarmPermissionError(message);
  }

  static async setExactAlarm(params: ScheduleParams): Promise<boolean> {
    if (Platform.OS !== 'android') return false;
    await this.ensureReady();
    const triggerAtMillis = params.triggerDate.getTime();
    if (!params.id || !Number.isFinite(triggerAtMillis) || triggerAtMillis <= Date.now()) {
      throw new Error('Thời điểm báo thức phải ở tương lai.');
    }
    return AndroidAlarmModule.setExactAlarm({
      id: params.id,
      triggerAtMillis,
      label: params.label,
      timeStr: params.timeStr,
      spokenText: params.spokenText || '',
      repeatDays: params.repeatDays || [],
      vibrate: params.vibrate ?? true,
    });
  }

  static async cancelAlarm(id: string): Promise<boolean> {
    if (!this.available) return false;
    return AndroidAlarmModule.cancelAlarm(id);
  }

  static async getActiveAlarm(): Promise<NativeAlarmPayload | null> {
    return this.available ? AndroidAlarmModule.getActiveAlarm() : null;
  }

  static async cancelAll(): Promise<void> {
    if (this.available) await AndroidAlarmModule.cancelAll();
  }

  static subscribe(listener: () => void): () => void {
    if (!this.available) return () => {};
    const subscription = new NativeEventEmitter(AndroidAlarmModule).addListener('NativeAlarmChanged', listener);
    return () => subscription.remove();
  }

  static async stopRinging(id: string): Promise<void> {
    if (this.available) await AndroidAlarmModule.stopRinging(id);
  }

  static async silence(id: string): Promise<void> {
    if (this.available) await AndroidAlarmModule.silence(id);
  }

  static async resumeSound(id: string): Promise<void> {
    if (this.available) await AndroidAlarmModule.resumeSound(id);
  }

  static async snooze(id: string): Promise<void> {
    await this.ensureReady();
    await AndroidAlarmModule.snooze(id);
  }
}
