import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { VoiceOrb } from '@shared/components/VoiceOrb';
import { VoiceOrbState } from '@domain/enums';
import { Sparkles, Clock, Calendar, ChevronRight } from 'lucide-react-native';

export const HomeScreen: React.FC = () => {
  const [orbState, setOrbState] = useState<VoiceOrbState>('idle');

  const handleOrbPress = () => {
    // Demo cycle between states when tapped
    if (orbState === 'idle') setOrbState('listening');
    else if (orbState === 'listening') setOrbState('thinking');
    else if (orbState === 'thinking') setOrbState('speaking');
    else setOrbState('idle');
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
          <Text style={styles.toneBadgeText}>Dễ thương 💖</Text>
        </View>
      </View>

      {/* Voice Orb Section */}
      <View style={styles.orbSection}>
        <VoiceOrb state={orbState} onPress={handleOrbPress} size={130} />
        <Text style={styles.orbHintTitle}>
          {orbState === 'listening'
            ? 'Đang lắng nghe bạn...'
            : orbState === 'thinking'
            ? 'Groq AI đang suy nghĩ...'
            : orbState === 'speaking'
            ? 'Đang phát lời đáp...'
            : 'Chạm để nói chuyện với AI'}
        </Text>
        <Text style={styles.orbHintSub}>
          Ví dụ: "Gọi tôi dậy lúc 6 rưỡi sáng mai nhé"
        </Text>
      </View>

      {/* Next Alarm Hero Card */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroIconWrapper}>
            <Clock size={20} color={Colors.secondary} />
          </View>
          <View style={styles.heroHeaderTextWrapper}>
            <Text style={styles.heroCardTag}>BÁO THỨC KẾ TIẾP</Text>
            <Text style={styles.heroCardRemaining}>còn 7 giờ 45 phút</Text>
          </View>
        </View>

        <Text style={styles.heroTime}>06:30</Text>
        <Text style={styles.heroAlarmTitle}>Thức dậy thể dục & ăn sáng</Text>

        <View style={styles.heroFooter}>
          <Text style={styles.heroAiNote}>
            ✨ Dự báo: 26°C, trời mát. Lịch họp lúc 09:00.
          </Text>
        </View>
      </View>

      {/* Quick Agenda Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Lịch trình hôm nay</Text>
        <TouchableOpacity style={styles.seeAllButton}>
          <Text style={styles.seeAllText}>Xem tất cả</Text>
          <ChevronRight size={14} color={Colors.textAccent} />
        </TouchableOpacity>
      </View>

      <View style={styles.agendaItem}>
        <Calendar size={18} color={Colors.primary} />
        <View style={styles.agendaTextWrapper}>
          <Text style={styles.agendaItemTitle}>Họp nhóm Sprint Planning</Text>
          <Text style={styles.agendaItemTime}>09:00 — Google Meet</Text>
        </View>
      </View>

      <View style={styles.agendaItem}>
        <Clock size={18} color={Colors.warning} />
        <View style={styles.agendaTextWrapper}>
          <Text style={styles.agendaItemTitle}>Nhắc nhở uống nước & đứng dậy</Text>
          <Text style={styles.agendaItemTime}>14:30 — Đếm ngược</Text>
        </View>
      </View>
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
    paddingBottom: 100, // Space for floating bottom nav
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
});
