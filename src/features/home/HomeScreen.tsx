import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { VoiceOrb } from '@shared/components/VoiceOrb';
import { VoiceOrbState } from '@domain/enums';
import { Sparkles, Clock, Calendar, ChevronRight } from 'lucide-react-native';
import { useAlarmStore } from '@shared/stores/useAlarmStore';
import { useReminderStore } from '@shared/stores/useReminderStore';
import { useSettingsStore } from '@shared/stores/useSettingsStore';
import { voicePipeline } from '@features/voice/voice_pipeline';

export const HomeScreen: React.FC = () => {
  const [orbState, setOrbState] = useState<VoiceOrbState>('idle');
  const [liveTranscription, setLiveTranscription] = useState<string>('');
  const [liveResponse, setLiveResponse] = useState<string>('');

  const { alarms, loadAlarms } = useAlarmStore();
  const { upcomingReminders, loadReminders } = useReminderStore();
  const { toneStyle, ttsEnabled, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadAlarms();
    loadReminders();
    loadSettings();
  }, [loadAlarms, loadReminders, loadSettings]);

  const activeAlarms = alarms.filter((a) => a.isActive);
  const nextAlarm = activeAlarms.length > 0 ? activeAlarms[0] : null;

  const handleOrbPress = async () => {
    try {
      if (orbState === 'idle') {
        setLiveTranscription('');
        setLiveResponse('');
        setOrbState('listening');
        await voicePipeline.startListening();
      } else if (orbState === 'listening') {
        setOrbState('thinking');
        const result = await voicePipeline.stopListeningAndProcess(
          toneStyle,
          ttsEnabled
        );
        setLiveTranscription(result.transcription);
        setLiveResponse(result.responseText);

        // Reload data stores to reflect any created alarms/reminders
        await Promise.all([loadAlarms(), loadReminders()]);

        setOrbState('speaking');
        // Reset to idle after a short moment
        setTimeout(() => {
          setOrbState('idle');
        }, 3000);
      } else if (orbState === 'speaking') {
        await voicePipeline.stopSpeaking();
        setOrbState('idle');
      }
    } catch (err: unknown) {
      setOrbState('idle');
      Alert.alert(
        'Thông báo giọng nói',
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi xử lý giọng nói'
      );
    }
  };

  const getToneLabel = () => {
    switch (toneStyle) {
      case 'friendly':
        return 'Thân thiện 😊';
      case 'professional':
        return 'Chuyên nghiệp 💼';
      case 'cute':
      default:
        return 'Dễ thương 💖';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingSub}>Thứ Năm, 10 Tháng 9</Text>
          <Text style={styles.greetingTitle}>Chào buổi sáng, Tâm 👋</Text>
        </View>
        <View style={styles.toneBadge}>
          <Sparkles size={14} color={Colors.ambientPurple} />
          <Text style={styles.toneBadgeText}>{getToneLabel()}</Text>
        </View>
      </View>

      {/* Voice Orb Section */}
      <View style={styles.orbSection}>
        <VoiceOrb state={orbState} onPress={handleOrbPress} size={130} />
        <Text style={styles.orbHintTitle}>
          {orbState === 'listening'
            ? 'Đang lắng nghe bạn nói (Chạm lại để gửi)...'
            : orbState === 'thinking'
            ? 'Groq AI đang phân tích ý định...'
            : orbState === 'speaking'
            ? 'Đang phát lời đáp...'
            : 'Chạm để nói chuyện với AI'}
        </Text>
        <Text style={styles.orbHintSub}>
          Ví dụ: "Gọi tôi dậy lúc 6 rưỡi sáng mai nhé"
        </Text>
      </View>

      {/* Live Speech Recognition & Response Banner */}
      {(liveTranscription || liveResponse) && (
        <View style={styles.liveBanner}>
          {liveTranscription ? (
            <Text style={styles.liveTranscriptionText}>
              🗣️ "{liveTranscription}"
            </Text>
          ) : null}
          {liveResponse ? (
            <Text style={styles.liveResponseText}>🤖 {liveResponse}</Text>
          ) : null}
        </View>
      )}

      {/* Next Alarm Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconWrapper}>
            <Clock size={20} color={Colors.secondary} />
          </View>
          <View style={styles.heroHeaderTextWrapper}>
            <Text style={styles.heroCardTag}>BÁO THỨC KẾ TIẾP</Text>
            <Text style={styles.heroCardRemaining}>
              {nextAlarm ? 'Đang kích hoạt' : 'Chưa có báo thức nào'}
            </Text>
          </View>
        </View>

        <Text style={styles.heroTime}>{nextAlarm ? nextAlarm.time : '--:--'}</Text>
        <Text style={styles.heroAlarmTitle}>
          {nextAlarm ? nextAlarm.label : 'Nói "Đặt báo thức 6h sáng" để tạo nhanh'}
        </Text>

        <View style={styles.heroFooter}>
          <Text style={styles.heroAiNote}>
            ✨ Dự báo: 26°C, trời mát. Lịch họp lúc 09:00.
          </Text>
        </View>
      </View>

      {/* Quick Agenda Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lời nhắc sắp diễn ra</Text>
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
          <ChevronRight size={14} color={Colors.textAccent} />
        </TouchableOpacity>
      </View>

      {upcomingReminders.length === 0 ? (
        <View style={styles.agendaEmpty}>
          <Text style={styles.agendaEmptyText}>
            Chưa có lời nhắc nào sắp tới
          </Text>
        </View>
      ) : (
        upcomingReminders.slice(0, 3).map((rem) => (
          <View key={rem.id} style={styles.agendaItem}>
            <Calendar size={18} color={Colors.primary} />
            <View style={styles.agendaTextWrapper}>
              <Text style={styles.agendaItemTitle}>{rem.title}</Text>
              <Text style={styles.agendaItemTime}>
                {new Date(rem.remindAt).toLocaleTimeString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingSub: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  greetingTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
    marginTop: 2,
  },
  toneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toneBadgeText: {
    ...Typography.labelSmall,
    color: Colors.textPrimary,
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  orbHintTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    marginTop: 12,
  },
  orbHintSub: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 4,
  },
  liveBanner: {
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderGlow,
    marginTop: 10,
    gap: 6,
  },
  liveTranscriptionText: {
    ...Typography.bodyMedium,
    color: Colors.secondary,
    fontStyle: 'italic',
  },
  liveResponseText: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
  },
  heroCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.borderGlow,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  heroHeaderTextWrapper: {
    flex: 1,
  },
  heroCardTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.secondary,
    letterSpacing: 0.8,
  },
  heroCardRemaining: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  heroTime: {
    ...Typography.displayLarge,
    color: Colors.textPrimary,
    marginVertical: 4,
  },
  heroAlarmTitle: {
    ...Typography.bodyLarge,
    color: Colors.textSecondary,
  },
  heroFooter: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  heroAiNote: {
    ...Typography.bodyMedium,
    color: Colors.textAccent,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 12,
  },
  sectionTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    ...Typography.labelSmall,
    color: Colors.textAccent,
  },
  agendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  agendaTextWrapper: {
    marginLeft: 14,
    flex: 1,
  },
  agendaItemTitle: {
    ...Typography.labelLarge,
    color: Colors.textPrimary,
  },
  agendaItemTime: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  agendaEmpty: {
    padding: 20,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  agendaEmptyText: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
  },
});
