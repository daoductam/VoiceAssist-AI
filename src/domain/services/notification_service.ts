import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm, Reminder } from '@domain/entities';
import { responseGenerator } from '@features/ai/response/response_generator';
import { useSettingsStore } from '@shared/stores/useSettingsStore';
import { NativeAlarmBridge } from '@core/utils/native_alarm_bridge';

// Configure foreground notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export class NotificationService {
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    if (Platform.OS === 'android') {
      // 1. Channel for Alarms (MAX priority, Alarm Audio Stream, Public Lockscreen, DND Bypass)
      await Notifications.setNotificationChannelAsync('alarms_channel', {
        name: 'Chuông Báo Thức',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 800, 400, 800, 400, 800],
        lightColor: '#6366F1',
        //sound: 'default',
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
          contentType: Notifications.AndroidAudioContentType.SONIFICATION,
          flags: {
            enforceAudibility: true,
            requestHardwareAudioVideoSynchronization: false,
          },
        },
      });

      // 2. Channel for Reminders
      await Notifications.setNotificationChannelAsync('reminders_channel', {
        name: 'Lời Nhắc Nhở',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 400, 250, 400],
        lightColor: '#38BDF8',
        //sound: 'default',
        enableVibrate: true,
        enableLights: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      });

      // 3. Register Action Buttons for notifications
      try {
        await Notifications.setNotificationCategoryAsync('alarm_actions', [
          {
            identifier: 'TALK_TO_AI',
            buttonTitle: '☀️ Nói chuyện với AI',
            options: {
              opensAppToForeground: true,
            },
          },
          {
            identifier: 'SNOOZE_5_MIN',
            buttonTitle: '⏰ Báo lại 5 phút',
            options: {
              opensAppToForeground: false,
            },
          },
        ]);
      } catch (e) {
        // Fallback if category unsupported
      }
    }

    this.isInitialized = true;
  }

  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Schedule an Alarm notification
   * Handles both one-time target dates and daily repetitions reliably across iOS & Android.
   * Embeds rich conversational AI text in notification body and payload data for instant 1-tap TTS speech.
   */
  async scheduleAlarm(alarm: Alarm, bodyMessage?: string): Promise<string> {
    await this.init();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(alarm.time) ||
      alarm.repeatDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
      throw new Error('Giờ hoặc ngày lặp báo thức không hợp lệ.');
    }
    if (Platform.OS === 'android') await NativeAlarmBridge.ensureReady();

    const [hourStr, minuteStr] = alarm.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Cancel existing notification for this alarm if any
    await this.cancelExpoNotifications(alarm.id);

    const tone = useSettingsStore.getState().toneStyle || 'friendly';
    const alertInfo = responseGenerator.generateAlarmAlert(
      alarm.label || 'Báo thức',
      alarm.time,
      tone
    );

    const title = alertInfo.title;
    const body = bodyMessage || alertInfo.body;
    const spokenText = alertInfo.spokenText;

    if (Platform.OS === 'android') {
      const targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0);
      while (targetDate.getTime() <= Date.now() ||
        (alarm.repeatDays.length > 0 && !alarm.repeatDays.includes((targetDate.getDay() + 6) % 7))) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
      await NativeAlarmBridge.setExactAlarm({
        id: alarm.id, triggerDate: targetDate, label: alarm.label || 'Báo thức',
        timeStr: alarm.time, spokenText, repeatDays: alarm.repeatDays, vibrate: alarm.vibrate,
      });
      return alarm.id;
    }

    const content: Notifications.NotificationContentInput = {
      title,
      body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      categoryIdentifier: 'alarm_actions',
      vibrate: [0, 800, 400, 800, 400, 800],
      sticky: true,
      data: {
        type: 'alarm',
        alarmId: alarm.id,
        time: alarm.time,
        label: alarm.label || 'Báo thức',
        spokenText,
      },
    };

    let primaryId = alarm.id;
    let trigger: Notifications.NotificationTriggerInput;

    if (alarm.repeatDays && alarm.repeatDays.length > 0) {
      // Recurring daily calendar trigger
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: true,
        channelId: 'alarms_channel',
      };

      primaryId = await Notifications.scheduleNotificationAsync({
        identifier: alarm.id,
        content,
        trigger,
      });
    } else {
      // One-time alarm: compute exact Date target
      const now = new Date();
      const targetDate = new Date();
      targetDate.setHours(hour, minute, 0, 0);

      // If target time has already passed today (or is within 5 seconds), schedule for tomorrow
      if (targetDate.getTime() <= now.getTime() + 5000) {
        targetDate.setDate(targetDate.getDate() + 1);
      }

      // Schedule consecutive burst (at T, T+8s, T+16s) so it rings and vibrates repeatedly
      for (let i = 0; i < 3; i++) {
        const burstDate = new Date(targetDate.getTime() + i * 8000);
        const burstId = await Notifications.scheduleNotificationAsync({
          identifier: `${alarm.id}_burst_${i}`,
          content: {
            ...content,
            title: i === 0 ? content.title : `⏰ ${alarm.time} • ${alarm.label || 'Báo thức'} (${i + 1}/3)`,
            body: i === 0 ? content.body : `Chuông báo thức đang reo! Chạm vào đây để nghe AI chào bạn ☀️`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: burstDate,
            channelId: 'alarms_channel',
          },
        });
        if (i === 0) primaryId = burstId;
      }
    }

    return primaryId;
  }

  /**
   * Schedule a one-time or repeating Reminder notification
   * Embeds rich conversational AI text in notification body and payload data for instant 1-tap TTS speech.
   */
  async scheduleReminder(reminder: Reminder, bodyMessage?: string): Promise<string> {
    await this.init();

    const triggerDate = new Date(reminder.remindAt);

    // Only schedule if in the future
    if (triggerDate.getTime() <= Date.now()) {
      return '';
    }

    await this.cancel(reminder.id);

    const tone = useSettingsStore.getState().toneStyle || 'friendly';
    const formattedTime = triggerDate.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const alertInfo = responseGenerator.generateReminderAlert(
      reminder.title,
      formattedTime,
      tone
    );

    const title = alertInfo.title;
    const body = bodyMessage || alertInfo.body;
    const spokenText = alertInfo.spokenText;

    const content: Notifications.NotificationContentInput = {
      title,
      body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      data: {
        type: 'reminder',
        reminderId: reminder.id,
        time: formattedTime,
        label: reminder.title,
        spokenText,
      },
    };

    let primaryId = reminder.id;
    // Schedule consecutive burst (T, T+8s) so it doesn't get missed during daytime
    for (let i = 0; i < 2; i++) {
      const burstDate = new Date(triggerDate.getTime() + i * 8000);
      const burstId = await Notifications.scheduleNotificationAsync({
        identifier: `${reminder.id}_burst_${i}`,
        content: {
          ...content,
          title: i === 0 ? content.title : `🔔 ${formattedTime} • ${reminder.title} (Nhắc lại)`,
          body: i === 0 ? content.body : `Đến giờ thực hiện rồi! Chạm vào đây để hoàn thành nhé 📌`,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: burstDate,
          channelId: 'reminders_channel',
        },
      });
      if (i === 0) primaryId = burstId;
    }

    return primaryId;
  }

  /**
   * Trigger an instant test alarm in N seconds with consecutive burst rings and rich speech
   */
  async triggerTestAlarm(seconds: number = 2): Promise<void> {
    await this.init();

    const tone = useSettingsStore.getState().toneStyle || 'friendly';
    const nowTime = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const alertInfo = responseGenerator.generateAlarmAlert('Thử nghiệm báo thức', nowTime, tone);

    if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('Số giây phải lớn hơn 0.');
    if (Platform.OS === 'android') {
      await NativeAlarmBridge.ensureReady();
      await this.cancel('test_alarm_native');
      for (let i = 0; i < 3; i++) {
        await Notifications.cancelScheduledNotificationAsync(`test_alarm_burst_${i}`);
      }
      await NativeAlarmBridge.setExactAlarm({
        id: 'test_alarm_native',
        triggerDate: new Date(Date.now() + seconds * 1000),
        label: 'Thử nghiệm báo thức',
        timeStr: nowTime,
        spokenText: alertInfo.spokenText,
      });
      return;
    }

    for (let i = 0; i < 3; i++) {
      await Notifications.scheduleNotificationAsync({
        identifier: `test_alarm_burst_${i}`,
        content: {
          title: i === 0 ? alertInfo.title : `⏰ ${nowTime} • Thử chuông (${i + 1}/3)`,
          body: i === 0 ? alertInfo.body : 'Chạm vào thông báo này để nghe AI cất giọng ngay lập tức! ✨',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'alarm_actions',
          vibrate: [0, 800, 400, 800, 400, 800],
          sticky: true,
          data: {
            type: 'alarm',
            time: nowTime,
            label: 'Thử nghiệm báo thức',
            spokenText: alertInfo.spokenText,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, seconds + i * 4),
          channelId: 'alarms_channel',
        },
      });
    }
  }

  /**
   * Trigger an instant test reminder in N seconds with rich speech
   */
  async triggerTestReminder(seconds: number = 2): Promise<void> {
    await this.init();

    const tone = useSettingsStore.getState().toneStyle || 'friendly';
    const nowTime = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const alertInfo = responseGenerator.generateReminderAlert(
      'Uống nước bổ sung năng lượng',
      nowTime,
      tone
    );

    for (let i = 0; i < 2; i++) {
      await Notifications.scheduleNotificationAsync({
        identifier: `test_reminder_burst_${i}`,
        content: {
          title: i === 0 ? alertInfo.title : `🔔 ${nowTime} • Thử lời nhắc (${i + 1}/2)`,
          body: i === 0 ? alertInfo.body : 'Chạm vào thông báo này để nghe AI đọc lời nhắc nhé! 📌',
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
          data: {
            type: 'reminder',
            time: nowTime,
            label: 'Uống nước bổ sung năng lượng',
            spokenText: alertInfo.spokenText,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, seconds + i * 4),
          channelId: 'reminders_channel',
        },
      });
    }
  }

  /**
   * Cancel scheduled notification by ID
   */
  async cancel(identifier: string): Promise<void> {
    await NativeAlarmBridge.cancelAlarm(identifier);
    await this.cancelExpoNotifications(identifier);
  }

  private async cancelExpoNotifications(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      for (let i = 0; i < 5; i++) {
        await Notifications.cancelScheduledNotificationAsync(`${identifier}_burst_${i}`);
      }
    } catch {
      // Ignore if doesn't exist
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAll(): Promise<void> {
    await NativeAlarmBridge.cancelAll();
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
