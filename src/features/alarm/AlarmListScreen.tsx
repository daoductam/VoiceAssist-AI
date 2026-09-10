import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { DAY_LABELS_VN } from '@core/constants';
import {
  Plus,
  Bell,
  Clock,
  CheckCircle2,
  Trash2,
  Sparkles,
  Play,
  Volume2,
} from 'lucide-react-native';
import { useAlarmStore } from '@shared/stores/useAlarmStore';
import { useReminderStore } from '@shared/stores/useReminderStore';
import { useTodoStore } from '@shared/stores/useTodoStore';
import { notificationService } from '@domain/services/notification_service';
import { ttsService } from '@features/voice/tts_service';

type SubTab = 'alarms' | 'reminders' | 'todos';

export const AlarmListScreen: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('alarms');

  // Add Alarm Modal State
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [inputTime, setInputTime] = useState<string>('');
  const [inputLabel, setInputLabel] = useState<string>('Báo thức');
  const [testCountdown, setTestCountdown] = useState<number | null>(null);

  const {
    alarms,
    loadAlarms,
    toggleAlarm,
    deleteAlarm,
    createAlarm,
    openRingingAlarm,
  } = useAlarmStore();
  const { reminders, loadReminders, completeReminder } = useReminderStore();
  const { todos, loadTodos, toggleTodo } = useTodoStore();

  useEffect(() => {
    loadAlarms();
    loadReminders();
    loadTodos();
  }, [loadAlarms, loadReminders, loadTodos]);

  // 1. Open ringing screen immediately (0s wait, no notification needed)
  const handleOpenAlarmDirectly = () => {
    const nowTime = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    openRingingAlarm({
      type: 'alarm',
      label: 'Báo thức ban ngày',
      time: nowTime,
      spokenText: `Đã ${nowTime} rồi bạn ơi! Đến giờ nghỉ tay, uống ngụm nước và chuẩn bị hoàn thành mục tiêu nhé!`,
    });
  };

  // 2. Schedule test notification in 3s (NO blocking Alert dialog)
  const handleTestAlarmScheduled = async () => {
    try {
      await notificationService.triggerTestAlarm(3);
      setTestCountdown(3);
      const timer = setInterval(() => {
        setTestCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(timer);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể kích hoạt chuông thử: ' + (e as Error).message);
    }
  };

  // 3. Test AI Voice immediately
  const handleTestSpeech = async () => {
    try {
      await ttsService.speak(
        'Xin chào bạn! Đây là giọng nói trợ lý AI thông minh từ VoiceAssist. Chúc bạn một ngày làm việc thật hiệu quả và tràn đầy niềm vui nhé!'
      );
    } catch (e) {
      Alert.alert('Lỗi âm thanh', 'Không thể phát giọng nói: ' + (e as Error).message);
    }
  };

  const handleOpenAddModal = () => {
    // Default time = 2 minutes from now
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    setInputTime(`${hh}:${mm}`);
    setInputLabel('Báo thức');
    setShowAddModal(true);
  };

  const handleSaveAlarm = async () => {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(inputTime)) {
      Alert.alert(
        'Giờ không hợp lệ',
        'Vui lòng nhập định dạng giờ HH:mm (ví dụ: 06:30 hoặc 17:05).'
      );
      return;
    }

    try {
      await createAlarm({
        time: inputTime,
        label: inputLabel.trim() || 'Báo thức',
      });
      setShowAddModal(false);
      Alert.alert('Thành công 🎉', `Đã đặt báo thức lúc ${inputTime}!`);
    } catch (e) {
      Alert.alert('Lỗi', 'Không thể tạo báo thức: ' + (e as Error).message);
    }
  };

  const handleDeleteAlarm = (id: string, time: string) => {
    Alert.alert('Xoá báo thức', `Bạn có chắc muốn xoá báo thức ${time}?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: () => deleteAlarm(id),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Top Segmented Tabs */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            subTab === 'alarms' && styles.segmentBtnActive,
          ]}
          onPress={() => setSubTab('alarms')}
          activeOpacity={0.8}
        >
          <Bell
            size={16}
            color={subTab === 'alarms' ? '#FFFFFF' : Colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              subTab === 'alarms' && styles.segmentTextActive,
            ]}
          >
            Báo thức ({alarms.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            subTab === 'reminders' && styles.segmentBtnActive,
          ]}
          onPress={() => setSubTab('reminders')}
          activeOpacity={0.8}
        >
          <Clock
            size={16}
            color={subTab === 'reminders' ? '#FFFFFF' : Colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              subTab === 'reminders' && styles.segmentTextActive,
            ]}
          >
            Lời nhắc ({reminders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            subTab === 'todos' && styles.segmentBtnActive,
          ]}
          onPress={() => setSubTab('todos')}
          activeOpacity={0.8}
        >
          <CheckCircle2
            size={16}
            color={subTab === 'todos' ? '#FFFFFF' : Colors.textMuted}
          />
          <Text
            style={[
              styles.segmentText,
              subTab === 'todos' && styles.segmentTextActive,
            ]}
          >
            To-do ({todos.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab 1: Alarms */}
        {subTab === 'alarms' && (
          <>
            {/* Quick Testing Control Center */}
            <View style={styles.testControlCard}>
              {/* Button A: Open Ringing Alarm Modal Directly */}
              <TouchableOpacity
                style={styles.openDirectBtn}
                onPress={handleOpenAlarmDirectly}
                activeOpacity={0.85}
              >
                <View style={styles.openDirectIconWrapper}>
                  <Sparkles size={20} color="#FFFFFF" />
                </View>
                <View style={styles.openDirectTextWrapper}>
                  <Text style={styles.openDirectTitle}>
                    Mở màn hình chuông reo (Thử ngay)
                  </Text>
                  <Text style={styles.openDirectSub}>
                    Rung dồn dập & AI đọc lời chào buổi sáng tức thì
                  </Text>
                </View>
                <Play size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Sub Row: Voice test & Lockscreen test */}
              <View style={styles.subTestingRow}>
                {/* Button B: Test AI Voice directly */}
                <TouchableOpacity
                  style={styles.subTestBtn}
                  onPress={handleTestSpeech}
                  activeOpacity={0.8}
                >
                  <Volume2 size={16} color={Colors.secondary} />
                  <Text style={styles.subTestBtnText}>Nghe giọng nói AI</Text>
                </TouchableOpacity>

                {/* Button C: 3-second lockscreen test */}
                <TouchableOpacity
                  style={[
                    styles.subTestBtn,
                    testCountdown !== null && styles.subTestBtnActive,
                  ]}
                  onPress={handleTestAlarmScheduled}
                  activeOpacity={0.8}
                >
                  <Bell
                    size={16}
                    color={testCountdown !== null ? '#FFFFFF' : Colors.warning}
                  />
                  <Text
                    style={[
                      styles.subTestBtnText,
                      testCountdown !== null && styles.subTestBtnTextActive,
                    ]}
                  >
                    {testCountdown !== null
                      ? `Reo sau ${testCountdown}s (Khoá máy)`
                      : 'Hẹn chuông 3s'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {alarms.length === 0 ? (
              <View style={styles.emptyCard}>
                <Bell size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Chưa có báo thức nào</Text>
                <Text style={styles.emptySub}>
                  Hãy thử chạm vào micro và nói: "Đặt báo thức 6 giờ 30 sáng mai"
                  hoặc bấm dấu (+) bên dưới.
                </Text>
              </View>
            ) : (
              alarms.map((alarm) => (
                <View key={alarm.id} style={styles.alarmCard}>
                  <View style={styles.alarmHeader}>
                    <View>
                      <Text
                        style={[
                          styles.alarmTime,
                          !alarm.isActive && styles.alarmTimeInactive,
                        ]}
                      >
                        {alarm.time}
                      </Text>
                      <Text style={styles.alarmLabel}>{alarm.label}</Text>
                    </View>
                    <View style={styles.alarmActions}>
                      <TouchableOpacity
                        style={styles.deleteBtn}
                        onPress={() => handleDeleteAlarm(alarm.id, alarm.time)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={18} color={Colors.textMuted} />
                      </TouchableOpacity>
                      <Switch
                        value={alarm.isActive}
                        onValueChange={() =>
                          toggleAlarm(alarm.id, !alarm.isActive)
                        }
                        trackColor={{
                          false: Colors.border,
                          true: Colors.primary,
                        }}
                        thumbColor={
                          alarm.isActive ? '#FFFFFF' : Colors.textMuted
                        }
                      />
                    </View>
                  </View>

                  {/* Repeat Days Pills */}
                  <View style={styles.repeatDaysRow}>
                    {DAY_LABELS_VN.map((dayLabel, index) => {
                      const isSelected = alarm.repeatDays.includes(index);
                      return (
                        <View
                          key={dayLabel}
                          style={[
                            styles.dayPill,
                            isSelected && styles.dayPillSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.dayPillText,
                              isSelected && styles.dayPillTextSelected,
                            ]}
                          >
                            {dayLabel}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))
            )}
          </>
        )}

        {/* Tab 2: Reminders */}
        {subTab === 'reminders' && (
          <>
            {reminders.length === 0 ? (
              <View style={styles.emptyCard}>
                <Clock size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Chưa có lời nhắc nào</Text>
                <Text style={styles.emptySub}>
                  Hãy thử nói: "Nhắc tôi uống nước sau 30 phút nữa"
                </Text>
              </View>
            ) : (
              reminders.map((reminder) => (
                <TouchableOpacity
                  key={reminder.id}
                  style={styles.itemCard}
                  onPress={() =>
                    completeReminder(reminder.id, !reminder.isCompleted)
                  }
                  activeOpacity={0.7}
                >
                  <Clock
                    size={20}
                    color={
                      reminder.isCompleted ? Colors.textMuted : Colors.secondary
                    }
                  />
                  <View style={styles.itemTextWrapper}>
                    <Text
                      style={[
                        styles.itemTitle,
                        reminder.isCompleted && styles.itemTitleCompleted,
                      ]}
                    >
                      {reminder.title}
                    </Text>
                    <Text style={styles.itemSub}>
                      {new Date(reminder.remindAt).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* Tab 3: Todos */}
        {subTab === 'todos' && (
          <>
            {todos.length === 0 ? (
              <View style={styles.emptyCard}>
                <CheckCircle2 size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Chưa có việc cần làm</Text>
                <Text style={styles.emptySub}>
                  Hãy thử nói: "Thêm vào danh sách mua rau củ hôm nay"
                </Text>
              </View>
            ) : (
              todos.map((todo) => (
                <TouchableOpacity
                  key={todo.id}
                  style={styles.itemCard}
                  onPress={() => toggleTodo(todo.id, !todo.isDone)}
                  activeOpacity={0.7}
                >
                  <CheckCircle2
                    size={20}
                    color={todo.isDone ? Colors.success : Colors.textMuted}
                  />
                  <View style={styles.itemTextWrapper}>
                    <Text
                      style={[
                        styles.itemTitle,
                        todo.isDone && styles.itemTitleCompleted,
                      ]}
                    >
                      {todo.title}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={handleOpenAddModal}
      >
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Quick Add Alarm Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⏰ Thêm báo thức mới</Text>

            <Text style={styles.inputLabel}>Giờ báo thức (HH:mm)</Text>
            <TextInput
              style={styles.textInput}
              value={inputTime}
              onChangeText={setInputTime}
              placeholder="07:00"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={styles.inputLabel}>Tên báo thức</Text>
            <TextInput
              style={styles.textInput}
              value={inputLabel}
              onChangeText={setInputLabel}
              placeholder="Báo thức"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSaveAlarm}
              >
                <Text style={styles.confirmBtnText}>Lưu báo thức</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    ...Typography.labelSmall,
    color: Colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  testControlCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderGlow,
    gap: 10,
  },
  openDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  openDirectIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  openDirectTextWrapper: {
    flex: 1,
  },
  openDirectTitle: {
    ...Typography.titleSmall,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  openDirectSub: {
    ...Typography.caption,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  subTestingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  subTestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subTestBtnActive: {
    backgroundColor: Colors.warning,
    borderColor: Colors.warning,
  },
  subTestBtnText: {
    ...Typography.caption,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  subTestBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  alarmCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  alarmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alarmTime: {
    ...Typography.displayMedium,
    color: Colors.textPrimary,
  },
  alarmTimeInactive: {
    color: Colors.textMuted,
  },
  alarmLabel: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  alarmActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteBtn: {
    padding: 6,
  },
  repeatDaysRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  dayPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.surfaceElevated,
  },
  dayPillSelected: {
    backgroundColor: Colors.primary,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  dayPillTextSelected: {
    color: '#FFFFFF',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  itemTextWrapper: {
    marginLeft: 12,
    flex: 1,
  },
  itemTitle: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
  },
  itemTitleCompleted: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },
  itemSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    marginTop: 14,
  },
  emptySub: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
    marginBottom: 18,
  },
  inputLabel: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 24,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
  },
  cancelBtnText: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
  },
  confirmBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  confirmBtnText: {
    ...Typography.labelMedium,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
