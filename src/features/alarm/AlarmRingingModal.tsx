import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { ttsService } from '@features/voice/tts_service';
import { Sun, Bell, BellOff, Clock, Sparkles, CheckCircle2 } from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

interface AlarmRingingModalProps {
  visible: boolean;
  type?: 'alarm' | 'reminder';
  alarmLabel?: string;
  alarmTime?: string;
  greetingText?: string;
  spokenText?: string;
  onDismiss: () => void;
  onSnooze: () => void;
}

export const AlarmRingingModal: React.FC<AlarmRingingModalProps> = ({
  visible,
  type = 'alarm',
  alarmLabel = 'Báo thức',
  alarmTime = '06:30',
  greetingText,
  spokenText,
  onDismiss,
  onSnooze,
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const isReminder = type === 'reminder';

  // Compute effective greeting and spoken texts
  const effectiveGreeting =
    greetingText ||
    (isReminder
      ? `Đã đến giờ thực hiện: "${alarmLabel}". Hãy dành chút thời gian hoàn thành ngay nhé! 📌`
      : 'Chào bạn nhé! Đã đến giờ báo thức rồi. Dậy thôi nào! ☀️');

  const effectiveSpeech = spokenText || effectiveGreeting;

  useEffect(() => {
    if (visible) {
      // Dismiss any remaining notification banners from tray
      Notifications.dismissAllNotificationsAsync().catch(() => {});

      // Start persistent rhythmic vibration
      Vibration.vibrate([0, 800, 400, 800, 400], true);

      let isMounted = true;

      // Continuously loop speech reminder so it doesn't stop until dismissed
      const runSpeechLoop = async () => {
        while (isMounted) {
          await ttsService.speak(effectiveSpeech);
          if (!isMounted) break;
          // Wait 3.5 seconds before repeating
          await new Promise((r) => setTimeout(r, 3500));
          if (!isMounted) break;
          await ttsService.speak(
            isReminder
              ? `Lời nhắc lúc ${alarmTime}: ${alarmLabel}. Chạm vào nút hoàn thành nếu bạn đã xong việc nhé!`
              : `Báo thức ${alarmTime}! Đã đến giờ rồi bạn ơi. Hãy mở mắt chào ngày mới nhé!`
          );
          if (!isMounted) break;
          await new Promise((r) => setTimeout(r, 3500));
        }
      };

      runSpeechLoop();

      // Start gentle pulsing animation
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();

      return () => {
        isMounted = false;
        loop.stop();
        Vibration.cancel();
        ttsService.stop();
      };
    }
  }, [visible, effectiveSpeech, alarmTime, alarmLabel, isReminder, pulseAnim]);

  const handleDismiss = () => {
    Vibration.cancel();
    ttsService.stop();
    Notifications.dismissAllNotificationsAsync().catch(() => {});
    onDismiss();
  };

  const handleSnooze = () => {
    Vibration.cancel();
    ttsService.stop();
    Notifications.dismissAllNotificationsAsync().catch(() => {});
    onSnooze();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <View style={styles.container}>
        {/* Ambient Top Glow */}
        <Animated.View
          style={[
            isReminder ? styles.reminderHalo : styles.sunHalo,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          {isReminder ? (
            <Bell size={64} color={Colors.secondary} />
          ) : (
            <Sun size={68} color={Colors.warning} />
          )}
        </Animated.View>

        {/* Alarm Title & Big Clock */}
        <View style={styles.timeSection}>
          <Text style={styles.alarmLabel}>{alarmLabel}</Text>
          <Text style={styles.clockDisplay}>{alarmTime}</Text>
        </View>

        {/* Empathetic Greeting / Dialogue Card */}
        <View style={styles.greetingCard}>
          <View style={styles.greetingHeader}>
            <Sparkles
              size={16}
              color={isReminder ? Colors.secondary : Colors.ambientPurple}
            />
            <Text
              style={[
                styles.greetingTag,
                isReminder && { color: Colors.secondary },
              ]}
            >
              {isReminder ? 'LỜI NHẮC TỪ TRỢ LÝ AI' : 'LỜI CHÀO BUỔI SÁNG NHÂN ÁI'}
            </Text>
          </View>
          <Text style={styles.greetingBody}>{effectiveGreeting}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          {/* Dismiss button */}
          <TouchableOpacity
            style={[
              styles.dismissBtn,
              isReminder && { backgroundColor: Colors.secondary },
            ]}
            onPress={handleDismiss}
            activeOpacity={0.85}
          >
            {isReminder ? (
              <CheckCircle2 size={22} color="#070810" />
            ) : (
              <BellOff size={22} color="#FFFFFF" />
            )}
            <Text
              style={[
                styles.dismissBtnText,
                isReminder && { color: '#070810' },
              ]}
            >
              {isReminder ? 'Đã hoàn thành ✨' : 'Tôi đã dậy rồi ✨'}
            </Text>
          </TouchableOpacity>

          {/* Snooze button */}
          <TouchableOpacity
            style={styles.snoozeBtn}
            onPress={handleSnooze}
            activeOpacity={0.8}
          >
            <Clock
              size={18}
              color={isReminder ? Colors.secondary : Colors.warning}
            />
            <Text
              style={[
                styles.snoozeBtnText,
                isReminder && { color: Colors.secondary },
              ]}
            >
              {isReminder ? 'Nhắc lại sau 10 phút' : 'Báo lại 5 phút'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070810',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  sunHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  reminderHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  timeSection: {
    alignItems: 'center',
  },
  alarmLabel: {
    ...Typography.titleMedium,
    color: Colors.textSecondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  clockDisplay: {
    ...Typography.displayLarge,
    fontSize: 72,
    color: Colors.textPrimary,
    letterSpacing: -2,
  },
  greetingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 22,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.borderGlow,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  greetingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  greetingTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.ambientPurple,
    letterSpacing: 0.8,
  },
  greetingBody: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  actionContainer: {
    width: '100%',
    gap: 14,
    marginBottom: 10,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  dismissBtnText: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  snoozeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  snoozeBtnText: {
    ...Typography.labelLarge,
    color: Colors.warning,
  },
});
