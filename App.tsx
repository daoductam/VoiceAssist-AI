import React, { useState, useEffect } from 'react';
import { Alert, AppState, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@core/theme/colors';
import { BottomNavBar, TabKey } from '@shared/components/BottomNavBar';
import { HomeScreen } from '@features/home/HomeScreen';
import { AlarmListScreen } from '@features/alarm/AlarmListScreen';
import { ChatScreen } from '@features/chat/ChatScreen';
import { SettingsScreen } from '@features/settings/SettingsScreen';
import { AlarmRingingModal } from '@features/alarm/AlarmRingingModal';
import { ReminderActionSheet } from '@features/alarm/ReminderActionSheet';
import * as Notifications from 'expo-notifications';
import { setAudioModeAsync } from 'expo-audio';
import { notificationService } from '@domain/services/notification_service';
import { alarmService } from '@domain/services/alarm_service';
import { reminderService } from '@domain/services/reminder_service';
import { AlarmPermissionError, NativeAlarmBridge } from '@core/utils/native_alarm_bridge';

import { useAlarmStore } from '@shared/stores/useAlarmStore';
import { useAlertStore } from '@shared/stores/useAlertStore';
import { useReminderStore } from '@shared/stores/useReminderStore';

const getStringValue = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isListening, setIsListening] = useState<boolean>(false);

  const { activeAlert, openAlarm, openReminder, closeAlert } = useAlertStore();

  const openAlertFromNotification = React.useCallback(
    (data: Record<string, unknown>, fallbackLabel?: string) => {
      const type = getStringValue(data.type);
      const time = getStringValue(data.time) || new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const label = getStringValue(data.label) || fallbackLabel;
      const spokenText = getStringValue(data.spokenText);

      if (type === 'alarm') {
        openAlarm({
          alarmId: getStringValue(data.alarmId),
          label: label || 'Báo thức',
          time,
          spokenText,
        });
      } else if (type === 'reminder') {
        openReminder({
          reminderId: getStringValue(data.reminderId),
          title: label || 'Lời nhắc nhở',
          time,
          spokenText,
        });
      }
    },
    [openAlarm, openReminder]
  );

  useEffect(() => {
    let disposed = false;
    let requestVersion = 0;
    const syncNativeAlarm = async () => {
      const version = ++requestVersion;
      try {
        const active = await NativeAlarmBridge.getActiveAlarm();
        if (disposed || version !== requestVersion || AppState.currentState !== 'active') return;
        const current = useAlertStore.getState().activeAlert;
        if (
          active &&
          !(current?.type === 'alarm' && current.occurrenceId === active.occurrenceId)
        ) {
          openAlarm({
            alarmId: active.id,
            label: active.label,
            time: active.time,
            spokenText: active.spokenText,
            nativeAudio: true,
            occurrenceId: active.occurrenceId,
          });
        } else if (!active && current?.type === 'alarm' && current.nativeAudio) {
          if (current.alarmId) {
            void useAlarmStore.getState().deactivateIfOneTime(current.alarmId);
          }
          closeAlert();
        }
      } catch (error) {
        console.warn('Could not read active native alarm:', error);
      }
    };
    const unsubscribe = NativeAlarmBridge.subscribe(() => { void syncNativeAlarm(); });
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') void syncNativeAlarm();
    });
    void syncNativeAlarm();
    return () => {
      disposed = true;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [openAlarm, closeAlert]);

  useEffect(() => {
    // 1. Enable audio playback in silent mode on iOS
    setAudioModeAsync({
      playsInSilentMode: true,
    }).catch((err) => console.warn('AudioMode error:', err));

    // 2. Request notification permissions and resync all alarms & reminders
    notificationService.requestPermissions().then(() => {
      alarmService.syncAllActiveAlarms();
      reminderService.syncAllActiveReminders();
    });

    // 3. Listen for incoming notification while app is in foreground
    const receivedSub = Notifications.addNotificationReceivedListener(
      (notification) => {
        const current = useAlertStore.getState().activeAlert;
        if (current?.type === 'alarm' && current.nativeAudio) return;
        const data = notification.request.content.data;
        if (data && typeof data === 'object') {
          openAlertFromNotification(
            data as Record<string, unknown>,
            notification.request.content.title || undefined
          );
        }
      }
    );

    // 4. Listen for notification taps (when opened from lockscreen or notification tray)
    // ZERO-FRICTION 1-TAP TO TALK: User taps banner -> immediately opens modal & plays voice
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const current = useAlertStore.getState().activeAlert;
        if (current?.type === 'alarm' && current.nativeAudio) return;
        const data = response.notification.request.content.data;
        if (data && typeof data === 'object') {
          openAlertFromNotification(
            data as Record<string, unknown>,
            response.notification.request.content.title || undefined
          );
        }
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [openAlertFromNotification]);

  const handleMicPress = () => {
    setIsListening((prev) => !prev);
    // Auto switch to home if mic is tapped
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
  };

  const handleDismissAlarm = async () => {
    const alert = useAlertStore.getState().activeAlert;
    if (!alert || alert.type !== 'alarm') return;

    if (alert.nativeAudio && alert.alarmId) {
      await NativeAlarmBridge.stopRinging(alert.alarmId);
    }
    if (alert.alarmId) {
      try {
        const alarm = useAlarmStore.getState().alarms.find(
          (item) => item.id === alert.alarmId
        ) || await alarmService.getById(alert.alarmId).catch(() => null);
        if (alarm && alarm.isActive && alarm.repeatDays.length === 0) {
          await alarmService.toggle(alarm.id, false);
          void useAlarmStore.getState().loadAlarms();
        }
      } catch (err) {
        console.warn('Failed to deactivate one-time alarm:', err);
      }
    }
    closeAlert();
  };

  const handleSnoozeAlarm = async () => {
    const alert = useAlertStore.getState().activeAlert;
    if (!alert || alert.type !== 'alarm') return;

    let alarm = alert.alarmId
      ? useAlarmStore.getState().alarms.find((item) => item.id === alert.alarmId)
      : undefined;
    if (!alarm && alert.alarmId) {
      alarm = await alarmService.getById(alert.alarmId).catch(() => undefined);
    }
    try {
      if (alert.nativeAudio && alert.alarmId) {
        await NativeAlarmBridge.snooze(alert.alarmId, alarm?.snoozeDuration || 5);
      } else if (alarm) {
        await notificationService.snoozeAlarm(alarm);
      } else {
        throw new Error('Không tìm thấy dữ liệu báo thức để báo lại.');
      }
      closeAlert();
    } catch (error) {
      if (error instanceof AlarmPermissionError) return;
      Alert.alert('Chưa thể hoãn báo thức', (error as Error).message);
    }
  };

  const handleCompleteReminder = async () => {
    const alert = useAlertStore.getState().activeAlert;
    if (!alert || alert.type !== 'reminder') return;

    if (!alert.reminderId) {
      closeAlert();
      return;
    }

    try {
      await reminderService.complete(alert.reminderId, true);
      void useReminderStore.getState().loadReminders();
      closeAlert();
    } catch (error) {
      Alert.alert('Chưa thể hoàn thành lời nhắc', (error as Error).message);
    }
  };

  const handleSnoozeReminder = async () => {
    const alert = useAlertStore.getState().activeAlert;
    if (!alert || alert.type !== 'reminder' || !alert.reminderId) return;

    try {
      const reminder = useReminderStore.getState().reminders.find(
        (item) => item.id === alert.reminderId
      ) || (await reminderService.getAll()).find(
        (item) => item.id === alert.reminderId
      );
      if (!reminder) {
        closeAlert();
        Alert.alert('Không tìm thấy lời nhắc', 'Lời nhắc này có thể đã bị xóa.');
        return;
      }
      await notificationService.snoozeReminder(reminder);
      closeAlert();
    } catch (error) {
      Alert.alert('Chưa thể nhắc lại', (error as Error).message);
    }
  };

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'home':
        return <HomeScreen />;
      case 'alarms':
        return <AlarmListScreen />;
      case 'chat':
        return <ChatScreen />;
      case 'settings':
        return <SettingsScreen />;
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <StatusBar style="light" />
        <View style={styles.screenWrapper}>{renderCurrentScreen()}</View>
        <BottomNavBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onMicPress={handleMicPress}
          isListening={isListening}
        />
        <AlarmRingingModal
          visible={activeAlert?.type === 'alarm'}
          alarmLabel={activeAlert?.type === 'alarm' ? activeAlert.label : undefined}
          alarmTime={activeAlert?.type === 'alarm' ? activeAlert.time : undefined}
          greetingText={activeAlert?.type === 'alarm' ? activeAlert.spokenText : undefined}
          spokenText={activeAlert?.type === 'alarm' ? activeAlert.spokenText : undefined}
          nativeAudio={activeAlert?.type === 'alarm' ? activeAlert.nativeAudio : false}
          alarmId={activeAlert?.type === 'alarm' ? activeAlert.alarmId : undefined}
          onDismiss={handleDismissAlarm}
          onSnooze={handleSnoozeAlarm}
        />
        <ReminderActionSheet
          visible={activeAlert?.type === 'reminder'}
          title={activeAlert?.type === 'reminder' ? activeAlert.title : 'Lời nhắc nhở'}
          time={activeAlert?.type === 'reminder' ? activeAlert.time : '--:--'}
          onComplete={handleCompleteReminder}
          onSnooze={handleSnoozeReminder}
          onClose={closeAlert}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenWrapper: {
    flex: 1,
  },
});
