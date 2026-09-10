import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { Alarm, Reminder } from '@domain/entities';

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
      // 1. Channel for Alarms (High priority)
      await Notifications.setNotificationChannelAsync('alarms_channel', {
        name: 'Chuông Báo Thức',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 250, 500],
        lightColor: '#6366F1',
        sound: 'default',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      // 2. Channel for Reminders
      await Notifications.setNotificationChannelAsync('reminders_channel', {
        name: 'Lời Nhắc Nhở',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#38BDF8',
        sound: 'default',
      });
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
   */
  async scheduleAlarm(alarm: Alarm, bodyMessage?: string): Promise<string> {
    await this.init();

    const [hourStr, minuteStr] = alarm.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Cancel existing notification for this alarm if any
    await this.cancel(alarm.id);

    const content: Notifications.NotificationContentInput = {
      title: `⏰ ${alarm.label || 'Báo thức'}`,
      body: bodyMessage || `Đã đến giờ ${alarm.time}! Thức dậy chào ngày mới nào.`,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      data: {
        type: 'alarm',
        alarmId: alarm.id,
        time: alarm.time,
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

      // Schedule consecutive burst (at T, T+10s, T+20s) so it rings and vibrates repeatedly
      for (let i = 0; i < 3; i++) {
        const burstDate = new Date(targetDate.getTime() + i * 10000);
        const burstId = await Notifications.scheduleNotificationAsync({
          identifier: `${alarm.id}_burst_${i}`,
          content: {
            ...content,
            title: i === 0 ? content.title : `⏰ ${alarm.label || 'Báo thức'} (${i + 1}/3)`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: burstDate,
          },
        });
        if (i === 0) primaryId = burstId;
      }
    }

    return primaryId;
  }

  /**
   * Schedule a one-time or repeating Reminder notification
   */
  async scheduleReminder(reminder: Reminder, bodyMessage?: string): Promise<string> {
    await this.init();

    const triggerDate = new Date(reminder.remindAt);

    // Only schedule if in the future
    if (triggerDate.getTime() <= Date.now()) {
      return '';
    }

    await this.cancel(reminder.id);

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: {
        title: `🔔 ${reminder.title}`,
        body: bodyMessage || `Đến giờ thực hiện: ${reminder.title}`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: {
          type: 'reminder',
          reminderId: reminder.id,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    return notificationId;
  }

  /**
   * Trigger an instant test alarm in N seconds with consecutive burst rings
   */
  async triggerTestAlarm(seconds: number = 2): Promise<void> {
    await this.init();

    const burstMessages = [
      'Thức dậy thôi nào bạn ơi! Chuông báo thức đã reo! ☀️',
      'Đã đến giờ rồi, mở mắt chào ngày mới thôi! ⏰',
      'Dậy nào, một ngày mới tràn đầy năng lượng đang chờ bạn! ✨',
      'Bấm vào thông báo này để vào màn hình thức dậy nhé! 🔔',
    ];

    for (let i = 0; i < burstMessages.length; i++) {
      await Notifications.scheduleNotificationAsync({
        identifier: `test_alarm_burst_${i}`,
        content: {
          title: `⏰ Báo thức (${i + 1}/${burstMessages.length})`,
          body: burstMessages[i],
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.MAX,
          data: {
            type: 'alarm',
            time: new Date().toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, seconds + i * 4),
        },
      });
    }
  }

  /**
   * Cancel scheduled notification by ID
   */
  async cancel(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      for (let i = 0; i < 5; i++) {
        await Notifications.cancelScheduledNotificationAsync(`${identifier}_burst_${i}`);
        await Notifications.cancelScheduledNotificationAsync(`test_alarm_burst_${i}`);
      }
    } catch {
      // Ignore if doesn't exist
    }
  }

  /**
   * Cancel all notifications
   */
  async cancelAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export const notificationService = new NotificationService();
