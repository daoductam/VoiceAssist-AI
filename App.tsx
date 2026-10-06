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
import * as Notifications from 'expo-notifications';
import { setAudioModeAsync } from 'expo-audio';
import { notificationService } from '@domain/services/notification_service';
import { alarmService } from '@domain/services/alarm_service';
import { reminderService } from '@domain/services/reminder_service';
import { AlarmPermissionError, NativeAlarmBridge } from '@core/utils/native_alarm_bridge';

import { useAlarmStore } from '@shared/stores/useAlarmStore';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isListening, setIsListening] = useState<boolean>(false);

  const { ringingAlarm, openRingingAlarm, closeRingingAlarm } = useAlarmStore();

  useEffect(() => {
    let disposed = false;
    let requestVersion = 0;
    const syncNativeAlarm = async () => {
      const version = ++requestVersion;
      try {
        const active = await NativeAlarmBridge.getActiveAlarm();
        if (disposed || version !== requestVersion || AppState.currentState !== 'active') return;
        const current = useAlarmStore.getState().ringingAlarm;
        if (active && active.occurrenceId !== current.occurrenceId) {
          openRingingAlarm({ ...active, type: 'alarm', nativeAudio: true });
        } else if (!active && current.nativeAudio && current.visible) {
          if (current.id) {
            void useAlarmStore.getState().deactivateIfOneTime(current.id);
          }
          closeRingingAlarm();
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
  }, [openRingingAlarm, closeRingingAlarm]);

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
        const current = useAlarmStore.getState().ringingAlarm;
        if (current.nativeAudio && current.visible) return;
        const data = notification.request.content.data;
        if (data && (data.type === 'alarm' || data.type === 'reminder')) {
          openRingingAlarm({
            type: data.type as 'alarm' | 'reminder',
            id: (data.alarmId || data.reminderId) as string,
            label:
              (data.label as string) ||
              notification.request.content.title ||
              (data.type === 'reminder' ? 'Lời nhắc nhở' : 'Báo thức'),
            time:
              (data.time as string) ||
              new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            spokenText: data.spokenText as string,
          });
        }
      }
    );

    // 4. Listen for notification taps (when opened from lockscreen or notification tray)
    // ZERO-FRICTION 1-TAP TO TALK: User taps banner -> immediately opens modal & plays voice
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const current = useAlarmStore.getState().ringingAlarm;
        if (current.nativeAudio && current.visible) return;
        const data = response.notification.request.content.data;
        if (data && (data.type === 'alarm' || data.type === 'reminder')) {
          openRingingAlarm({
            type: data.type as 'alarm' | 'reminder',
            id: (data.alarmId || data.reminderId) as string,
            label:
              (data.label as string) ||
              response.notification.request.content.title ||
              (data.type === 'reminder' ? 'Lời nhắc nhở' : 'Báo thức'),
            time:
              (data.time as string) ||
              new Date().toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              }),
            spokenText: data.spokenText as string,
          });
        }
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [openRingingAlarm]);

  const handleMicPress = () => {
    setIsListening((prev) => !prev);
    // Auto switch to home if mic is tapped
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
  };

  const handleDismissAlarm = async () => {
    if (ringingAlarm.nativeAudio && ringingAlarm.id) {
      await NativeAlarmBridge.stopRinging(ringingAlarm.id);
    }
    if (ringingAlarm.type === 'reminder' && ringingAlarm.id) {
      try {
        await reminderService.complete(ringingAlarm.id, true);
      } catch (err) {
        console.warn('Failed to complete reminder:', err);
      }
    }
    if (ringingAlarm.type === 'alarm' && ringingAlarm.id) {
      try {
        await useAlarmStore.getState().deactivateIfOneTime(ringingAlarm.id);
      } catch (err) {
        console.warn('Failed to deactivate one-time alarm:', err);
      }
    }
    closeRingingAlarm();
  };

  const handleSnoozeAlarm = () => {
    if (ringingAlarm.nativeAudio && ringingAlarm.id) {
      NativeAlarmBridge.snooze(ringingAlarm.id).then(closeRingingAlarm).catch(error => {
        if (error instanceof AlarmPermissionError) return;
        Alert.alert('Chưa thể hoãn báo thức', (error as Error).message);
      });
      return;
    }
    const isReminder = ringingAlarm.type === 'reminder';
    const snoozeLabel = ringingAlarm.label;
    const snoozeType = ringingAlarm.type;
    const snoozeTime = ringingAlarm.time;

    closeRingingAlarm();
    // Schedule a 10-minute snooze notification
    Notifications.scheduleNotificationAsync({
      content: {
        title: isReminder ? `🔔 ${snoozeLabel} (Nhắc lại)` : `⏰ ${snoozeTime} • ${snoozeLabel} (Báo lại)`,
        body: `Đã hết thời gian hoãn cho "${snoozeLabel}". Chạm vào đây để hoàn thành ngay nhé!`,
        sound: 'default',
        data: {
          type: snoozeType,
          label: snoozeLabel,
          time: snoozeTime,
          spokenText: `Đã hết thời gian hoãn cho ${snoozeLabel}. Hãy hoàn thành ngay bạn nhé!`,
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 600, // 10 minutes
      },
    });
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
          visible={ringingAlarm.visible}
          type={ringingAlarm.type}
          alarmLabel={ringingAlarm.label}
          alarmTime={ringingAlarm.time}
          greetingText={ringingAlarm.spokenText}
          spokenText={ringingAlarm.spokenText}
          nativeAudio={ringingAlarm.nativeAudio}
          alarmId={ringingAlarm.id}
          onDismiss={handleDismissAlarm}
          onSnooze={handleSnoozeAlarm}
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
