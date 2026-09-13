import { Platform, Linking, Alert } from 'react-native';

export class AndroidBatteryOptimizer {
  /**
   * Check if running on Android
   */
  static isAndroid(): boolean {
    return Platform.OS === 'android';
  }

  /**
   * Open Android system settings to request ignoring battery optimizations for VoiceAssist AI.
   * This ensures alarms trigger with sub-second precision even when the phone sleeps overnight.
   */
  static async requestIgnoreBatteryOptimizations(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // 1. Try launching direct intent for package battery optimization request via React Native Linking.sendIntent
      await Linking.sendIntent('android.settings.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS', [
        { key: 'data', value: 'package:com.voiceassist.ai' },
      ]);
    } catch {
      try {
        // 2. Fallback to general battery optimization screen
        await Linking.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      } catch {
        try {
          // 3. Fallback to application details settings
          await Linking.openSettings();
        } catch {
          Alert.alert(
            'Cài đặt pin',
            'Vui lòng vào Cài đặt máy > Ứng dụng > VoiceAssist AI > Pin và chọn "Không hạn chế" để đảm bảo báo thức reo chuẩn xác nhất!'
          );
        }
      }
    }
  }
}
