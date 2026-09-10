import React, { useState, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [ringingAlarm, setRingingAlarm] = useState<{
    visible: boolean;
    label: string;
    time: string;
  }>({
    visible: false,
    label: 'Báo thức buổi sáng',
    time: '06:30',
  });

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
        const data = notification.request.content.data;
        if (data && data.type === 'alarm') {
          setRingingAlarm({
            visible: true,
            label: notification.request.content.title || 'Báo thức',
            time: (data.time as string) || '06:30',
          });
        }
      }
    );

    // 4. Listen for notification taps (when opened from lockscreen or notification tray)
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data && data.type === 'alarm') {
          setRingingAlarm({
            visible: true,
            label: response.notification.request.content.title || 'Báo thức',
            time: (data.time as string) || '06:30',
          });
        }
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, []);

  const handleMicPress = () => {
    setIsListening((prev) => !prev);
    // Auto switch to home if mic is tapped
    if (activeTab !== 'home') {
      setActiveTab('home');
    }
  };

  const handleDismissAlarm = () => {
    setRingingAlarm((prev) => ({ ...prev, visible: false }));
  };

  const handleSnoozeAlarm = () => {
    setRingingAlarm((prev) => ({ ...prev, visible: false }));
    // Schedule a 5-minute snooze notification
    Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Báo thức lại (Snooze)',
        body: 'Đã hết 5 phút báo lại rồi, dậy thôi nào!',
        sound: 'default',
        data: { type: 'alarm', time: ringingAlarm.time },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 300,
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
          alarmLabel={ringingAlarm.label}
          alarmTime={ringingAlarm.time}
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
