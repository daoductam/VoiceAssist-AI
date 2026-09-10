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
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Schedule a daily or recurring Alarm notification
   */
  async scheduleAlarm(alarm: Alarm, bodyMessage: string): Promise<string> {
    await this.init();

    const [hourStr, minuteStr] = alarm.time.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Cancel existing notification for this alarm if any
    await this.cancel(alarm.id);

    const notificationId = await Notifications.scheduleNotificationAsync({
      identifier: alarm.id,
      content: {
        title: `⏰ ${alarm.label || 'Báo thức'}`,
        body: bodyMessage || `Đã đến giờ ${alarm.time}! Thức dậy chào ngày mới nào.`,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        data: {
          type: 'alarm',
          alarmId: alarm.id,
          time: alarm.time,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
        hour,
        minute,
        repeats: alarm.repeatDays.length > 0,
      },
    });

    return notificationId;
  }

  /**
   * Schedule a one-time or repeating Reminder notification
   */
  async scheduleReminder(reminder: Reminder, bodyMessage: string): Promise<string> {
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
        title: '🔔 Lời nhắc nhở',
        body: bodyMessage || reminder.title,
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
   * Cancel scheduled notification by ID
   */
  async cancel(identifier: string): Promise<void> {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
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
