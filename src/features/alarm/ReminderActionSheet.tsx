import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';

interface ReminderActionSheetProps {
  visible: boolean;
  title: string;
  time: string;
  onComplete: () => void;
  onSnooze: () => void;
  onClose: () => void;
}

export const ReminderActionSheet: React.FC<ReminderActionSheetProps> = ({
  visible,
  title,
  time,
  onComplete,
  onSnooze,
  onClose,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    transparent
    onRequestClose={onClose}
  >
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.titleGroup}>
            <View style={styles.iconWrapper}>
              <Bell size={20} color={Colors.secondary} />
            </View>
            <View style={styles.titleTextGroup}>
              <Text style={styles.eyebrow}>LỜI NHẮC TỪ TRỢ LÝ AI</Text>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Đóng lời nhắc"
          >
            <X size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.time}>Đến giờ lúc {time}</Text>
        <Text style={styles.description}>
          Bạn đã hoàn thành việc này chưa? Chọn một hành động để tiếp tục.
        </Text>

        <TouchableOpacity
          style={styles.completeButton}
          onPress={onComplete}
          accessibilityRole="button"
          accessibilityLabel="Đánh dấu lời nhắc đã hoàn thành"
          activeOpacity={0.85}
        >
          <CheckCircle2 size={20} color="#070810" />
          <Text style={styles.completeButtonText}>Đã hoàn thành</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.snoozeButton}
          onPress={onSnooze}
          accessibilityRole="button"
          accessibilityLabel="Nhắc lại sau 10 phút"
          activeOpacity={0.8}
        >
          <Clock size={18} color={Colors.secondary} />
          <Text style={styles.snoozeButtonText}>Nhắc lại sau 10 phút</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.58)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.borderGlow,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(56, 189, 248, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  titleTextGroup: {
    flex: 1,
  },
  eyebrow: {
    ...Typography.labelSmall,
    color: Colors.secondary,
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  title: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  time: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 18,
  },
  description: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    marginTop: 6,
    marginBottom: 18,
  },
  completeButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  completeButtonText: {
    ...Typography.titleMedium,
    color: '#070810',
    fontWeight: '700',
  },
  snoozeButton: {
    minHeight: 50,
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: Colors.surfaceElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  snoozeButtonText: {
    ...Typography.labelLarge,
    color: Colors.secondary,
  },
});
