import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@core/theme/colors';
import { BottomNavBar, TabKey } from '@shared/components/BottomNavBar';
import { HomeScreen } from '@features/home/HomeScreen';
import { AlarmListScreen } from '@features/alarm/AlarmListScreen';
import { ChatScreen } from '@features/chat/ChatScreen';
import { SettingsScreen } from '@features/settings/SettingsScreen';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [isListening, setIsListening] = useState<boolean>(false);

  const handleMicPress = () => {
    setIsListening((prev) => !prev);
    // Auto switch to home if mic is tapped
    if (activeTab !== 'home') {
      setActiveTab('home');
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
