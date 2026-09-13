import React, { useEffect, useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { ttsService } from '@features/voice/tts_service';
import { NativeAlarmBridge } from '@core/utils/native_alarm_bridge';
import { sttService } from '@features/voice/stt_service';
import {
  morningBriefingService,
  MorningBriefingData,
} from '@features/alarm/services/morning_briefing_service';
import {
  Sun,
  Bell,
  BellOff,
  Clock,
  Sparkles,
  CheckCircle2,
  Mic,
  MicOff,
  ListTodo,
  CalendarCheck,
  ArrowRight,
} from 'lucide-react-native';
import * as Notifications from 'expo-notifications';

interface AlarmRingingModalProps {
  visible: boolean;
  type?: 'alarm' | 'reminder';
  alarmLabel?: string;
  alarmTime?: string;
  greetingText?: string;
  spokenText?: string;
  nativeAudio?: boolean;
  alarmId?: string;
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
  nativeAudio = false,
  alarmId,
  onDismiss,
  onSnooze,
}) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  const isReminder = type === 'reminder';

  // State for Morning Briefing flow
  const [isBriefingMode, setIsBriefingMode] = useState<boolean>(false);
  const [briefingData, setBriefingData] = useState<MorningBriefingData | null>(null);
  const [isLoadingBriefing, setIsLoadingBriefing] = useState<boolean>(false);

  // State for Voice Control
  const [isVoiceListening, setIsVoiceListening] = useState<boolean>(false);
  const [voiceStatusText, setVoiceStatusText] = useState<string>('');

  const isMountedRef = useRef<boolean>(false);

  // Compute effective greeting and spoken texts
  const effectiveGreeting =
    greetingText ||
    (isReminder
      ? `Đã đến giờ thực hiện: "${alarmLabel}". Hãy dành chút thời gian hoàn thành ngay nhé! 📌`
      : 'Chào bạn nhé! Đã đến giờ báo thức rồi. Dậy thôi nào! ☀️');

  const effectiveSpeech = spokenText || effectiveGreeting;

  useEffect(() => {
    if (visible) {
      isMountedRef.current = true;
      setIsBriefingMode(false);
      setBriefingData(null);
      setIsVoiceListening(false);
      setVoiceStatusText('');

      // Dismiss any remaining notification banners from tray
      if (!nativeAudio) Notifications.dismissAllNotificationsAsync().catch(() => {});

      // Gentle Wakeup Crescendo Vibration pattern: gentle first, then stronger
      if (!nativeAudio) Vibration.vibrate([0, 400, 600, 400, 600, 800, 400, 800], true);

      // Continuously loop speech reminder until dismissed or briefing activated
      const runSpeechLoop = async () => {
        while (isMountedRef.current && !isBriefingMode) {
          await ttsService.speak(effectiveSpeech);
          if (!isMountedRef.current) break;

          // Wait 3.5 seconds before repeating
          await new Promise((r) => setTimeout(r, 3500));
          if (!isMountedRef.current) break;

          await ttsService.speak(
            isReminder
              ? `Lời nhắc lúc ${alarmTime}: ${alarmLabel}. Chạm vào nút hoàn thành nếu bạn đã xong việc nhé!`
              : `Báo thức ${alarmTime}! Đã đến giờ rồi bạn ơi. Bạn có thể nói "Ngủ thêm" hoặc "Dậy rồi" nhé!`
          );
          if (!isMountedRef.current) break;
          await new Promise((r) => setTimeout(r, 4000));
        }
      };

      if (!nativeAudio) runSpeechLoop();

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
        isMountedRef.current = false;
        loop.stop();
        if (!nativeAudio) Vibration.cancel();
        ttsService.stop();
      };
    }
  }, [visible, effectiveSpeech, alarmTime, alarmLabel, isReminder, pulseAnim, nativeAudio]);

  // Voice Command Trigger
  const handleToggleVoiceControl = async () => {
    if (isVoiceListening) {
      // Stop recording
      setVoiceStatusText('Đang xử lý giọng nói...');
      try {
        const text = await sttService.stopRecordingAndTranscribe();
        setIsVoiceListening(false);
        if (nativeAudio && alarmId) await NativeAlarmBridge.resumeSound(alarmId);
        processVoiceCommand(text);
      } catch (err) {
        setIsVoiceListening(false);
        setVoiceStatusText('');
        if (nativeAudio && alarmId) await NativeAlarmBridge.resumeSound(alarmId);
      }
    } else {
      // Start recording voice command
      try {
        if (nativeAudio && alarmId) await NativeAlarmBridge.silence(alarmId);
        ttsService.stop();
        setIsVoiceListening(true);
        setVoiceStatusText('Đang nghe... Bạn hãy nói "Dậy rồi" hoặc "Ngủ thêm"');
        await sttService.startRecording();
      } catch (err) {
        setIsVoiceListening(false);
        setVoiceStatusText('Chưa bật được micro');
        if (nativeAudio && alarmId) await NativeAlarmBridge.resumeSound(alarmId);
      }
    }
  };

  const processVoiceCommand = (command: string) => {
    const lower = command.toLowerCase();
    if (!lower.trim()) {
      setVoiceStatusText('Không nghe rõ, vui lòng thử lại');
      return;
    }

    setVoiceStatusText(`Nhận diện: "${command}"`);

    // Check for snooze
    if (
      lower.includes('ngủ thêm') ||
      lower.includes('hoãn') ||
      lower.includes('báo lại') ||
      lower.includes('snooze') ||
      lower.includes('5 phút') ||
      lower.includes('10 phút')
    ) {
      setTimeout(() => {
        handleSnooze();
      }, 1000);
      return;
    }

    // Check for dismiss / wakeup
    if (
      lower.includes('dậy rồi') ||
      lower.includes('tôi dậy') ||
      lower.includes('tắt chuông') ||
      lower.includes('chào buổi sáng') ||
      lower.includes('xong rồi') ||
      lower.includes('tắt') ||
      lower.includes('dừng')
    ) {
      setTimeout(() => {
        handleWakeUpAction();
      }, 800);
      return;
    }

    setVoiceStatusText(`Không nhận diện được lệnh: "${command}"`);
  };

  const handleWakeUpAction = async () => {
    isMountedRef.current = false;
    if (nativeAudio && alarmId) await NativeAlarmBridge.silence(alarmId);
    Vibration.cancel();
    ttsService.stop();

    if (isReminder) {
      // Reminders don't need a full morning briefing
      Notifications.dismissAllNotificationsAsync().catch(() => {});
      onDismiss();
      return;
    }

    // Enter Morning Briefing Mode
    setIsBriefingMode(true);
    setIsLoadingBriefing(true);

    try {
      const data = await morningBriefingService.generateBriefing(alarmLabel);
      setBriefingData(data);
      setIsLoadingBriefing(false);

      // Play morning briefing speech
      await ttsService.speak(data.fullSpeechText);
    } catch (e) {
      setIsLoadingBriefing(false);
      Notifications.dismissAllNotificationsAsync().catch(() => {});
      onDismiss();
    }
  };

  const handleDismiss = () => {
    isMountedRef.current = false;
    Vibration.cancel();
    ttsService.stop();
    Notifications.dismissAllNotificationsAsync().catch(() => {});
    onDismiss();
  };

  const handleSnooze = () => {
    if (nativeAudio) {
      onSnooze();
      return;
    }
    isMountedRef.current = false;
    Vibration.cancel();
    ttsService.stop();
    Notifications.dismissAllNotificationsAsync().catch(() => {});
    onSnooze();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={handleDismiss}>
      <View style={styles.container}>
        {!isBriefingMode ? (
          /* ================= ALARM RINGING VIEW ================= */
          <>
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

            {/* Voice Command Section */}
            <View style={styles.voiceSection}>
              <TouchableOpacity
                style={[
                  styles.voiceControlBtn,
                  isVoiceListening && styles.voiceControlBtnActive,
                ]}
                onPress={handleToggleVoiceControl}
                activeOpacity={0.8}
              >
                {isVoiceListening ? (
                  <Mic size={20} color="#FFFFFF" />
                ) : (
                  <Mic size={20} color={Colors.secondary} />
                )}
                <Text style={styles.voiceControlBtnText}>
                  {isVoiceListening ? 'Đang nghe... (Chạm để gửi)' : 'Nói lệnh (Ngủ thêm / Dậy rồi)'}
                </Text>
              </TouchableOpacity>
              {voiceStatusText ? (
                <Text style={styles.voiceStatusText}>{voiceStatusText}</Text>
              ) : null}
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              {/* Wake Up / Dismiss Button */}
              <TouchableOpacity
                style={[
                  styles.dismissBtn,
                  isReminder && { backgroundColor: Colors.secondary },
                ]}
                onPress={handleWakeUpAction}
                activeOpacity={0.85}
              >
                {isReminder ? (
                  <CheckCircle2 size={22} color="#070810" />
                ) : (
                  <Sun size={22} color="#FFFFFF" />
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

              {/* Snooze Button */}
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
          </>
        ) : (
          /* ================= MORNING BRIEFING VIEW ================= */
          <View style={styles.briefingContainer}>
            {/* Header Icon */}
            <View style={styles.briefingSunHalo}>
              <Sun size={56} color={Colors.warning} />
            </View>

            <Text style={styles.briefingTitle}>
              {briefingData?.greeting || 'Chào buổi sáng!'}
            </Text>
            <Text style={styles.briefingSummary}>
              {briefingData?.summary || 'Đang chuẩn bị lịch trình ngày mới cho bạn...'}
            </Text>

            {isLoadingBriefing ? (
              <View style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>AI đang tổng hợp lịch trình...</Text>
              </View>
            ) : (
              <View style={styles.briefingCard}>
                <View style={styles.briefingCardHeader}>
                  <ListTodo size={20} color={Colors.primary} />
                  <Text style={styles.briefingCardTitle}>Mục tiêu hôm nay</Text>
                </View>

                {briefingData?.topTasks && briefingData.topTasks.length > 0 ? (
                  briefingData.topTasks.map((task, idx) => (
                    <View key={idx} style={styles.taskItem}>
                      <View style={styles.taskBullet} />
                      <Text style={styles.taskText}>{task}</Text>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyTaskWrapper}>
                    <CalendarCheck size={28} color={Colors.success} />
                    <Text style={styles.emptyTaskText}>
                      Hôm nay không có đầu việc tồn đọng. Chúc bạn có một ngày thư thái!
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Bottom Button to finish Briefing */}
            <TouchableOpacity
              style={styles.startDayBtn}
              onPress={handleDismiss}
              activeOpacity={0.85}
            >
              <Text style={styles.startDayBtnText}>Bắt đầu ngày mới</Text>
              <ArrowRight size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
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
    paddingVertical: 50,
    paddingHorizontal: 24,
  },
  sunHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
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
    marginTop: 10,
    borderWidth: 2,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  timeSection: {
    alignItems: 'center',
  },
  alarmLabel: {
    ...Typography.titleMedium,
    color: Colors.textSecondary,
    marginBottom: 6,
    textAlign: 'center',
  },
  clockDisplay: {
    ...Typography.displayLarge,
    fontSize: 68,
    color: Colors.textPrimary,
    letterSpacing: -2,
  },
  greetingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 8,
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
    lineHeight: 22,
  },
  voiceSection: {
    width: '100%',
    alignItems: 'center',
  },
  voiceControlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  voiceControlBtnActive: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  voiceControlBtnText: {
    ...Typography.labelMedium,
    color: Colors.textPrimary,
  },
  voiceStatusText: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  actionContainer: {
    width: '100%',
    gap: 12,
  },
  dismissBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
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
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  snoozeBtnText: {
    ...Typography.labelLarge,
    color: Colors.warning,
  },

  /* Morning Briefing Styles */
  briefingContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  briefingSunHalo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    marginTop: 10,
  },
  briefingTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginTop: 14,
  },
  briefingSummary: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 16,
  },
  loadingWrapper: {
    marginVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
  },
  briefingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.border,
    marginVertical: 20,
  },
  briefingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  briefingCardTitle: {
    ...Typography.labelLarge,
    color: Colors.primary,
    fontWeight: '700',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  taskBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  taskText: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
  },
  emptyTaskWrapper: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  emptyTaskText: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  startDayBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  startDayBtnText: {
    ...Typography.titleMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
