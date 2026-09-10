import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, Bell, MessageSquare, Settings, Mic } from 'lucide-react-native';
import { Colors } from '@core/theme/colors';

export type TabKey = 'home' | 'alarms' | 'chat' | 'settings';

interface BottomNavBarProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  onMicPress: () => void;
  isListening?: boolean;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({
  activeTab,
  onTabChange,
  onMicPress,
  isListening = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('home')}
          activeOpacity={0.7}
        >
          <Home
            size={22}
            color={activeTab === 'home' ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'home' && styles.tabLabelActive,
            ]}
          >
            Trang chủ
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Alarms & Reminders */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('alarms')}
          activeOpacity={0.7}
        >
          <Bell
            size={22}
            color={activeTab === 'alarms' ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'alarms' && styles.tabLabelActive,
            ]}
          >
            Báo thức
          </Text>
        </TouchableOpacity>

        {/* Center Floating Mic Button */}
        <View style={styles.centerSlot}>
          <TouchableOpacity
            style={[
              styles.centerMicButton,
              isListening && styles.centerMicButtonListening,
            ]}
            onPress={onMicPress}
            activeOpacity={0.85}
          >
            <Mic size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Tab 3: Chat / History Log */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('chat')}
          activeOpacity={0.7}
        >
          <MessageSquare
            size={22}
            color={activeTab === 'chat' ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'chat' && styles.tabLabelActive,
            ]}
          >
            Nhật ký
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Settings */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('settings')}
          activeOpacity={0.7}
        >
          <Settings
            size={22}
            color={activeTab === 'settings' ? Colors.primary : Colors.textMuted}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'settings' && styles.tabLabelActive,
            ]}
          >
            Cài đặt
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: Platform.OS === 'ios' ? 84 : 70,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  centerSlot: {
    width: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMicButton: {
    position: 'absolute',
    top: -24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  centerMicButtonListening: {
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
    transform: [{ scale: 1.08 }],
  },
});
