import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { DAY_LABELS_VN } from '@core/constants';
import { Plus, Bell, Clock, CheckCircle2 } from 'lucide-react-native';
import { useAlarmStore } from '@shared/stores/useAlarmStore';
import { useReminderStore } from '@shared/stores/useReminderStore';
import { useTodoStore } from '@shared/stores/useTodoStore';

type SubTab = 'alarms' | 'reminders' | 'todos';

export const AlarmListScreen: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('alarms');

  const { alarms, loadAlarms, toggleAlarm } = useAlarmStore();
  const { reminders, loadReminders, completeReminder } = useReminderStore();
  const { todos, loadTodos, toggleTodo } = useTodoStore();

  useEffect(() => {
    loadAlarms();
    loadReminders();
    loadTodos();
  }, [loadAlarms, loadReminders, loadTodos]);

  return (
    <View style={styles.container}>
      {/* Top Segmented Tabs */}
      <View style={styles.segmentedContainer}>
        <TouchableOpacity
          style={[styles.segmentBtn, subTab === 'alarms' && styles.segmentBtnActive]}
          onPress={() => setSubTab('alarms')}
          activeOpacity={0.8}
        >
          <Bell size={16} color={subTab === 'alarms' ? '#FFFFFF' : Colors.textMuted} />
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
          style={[styles.segmentBtn, subTab === 'todos' && styles.segmentBtnActive]}
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
            {alarms.length === 0 ? (
              <View style={styles.emptyCard}>
                <Bell size={36} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>Chưa có báo thức nào</Text>
                <Text style={styles.emptySub}>
                  Hãy thử chạm vào micro và nói: "Đặt báo thức 6 giờ 30 sáng mai"
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
                    <Switch
                      value={alarm.isActive}
                      onValueChange={() => toggleAlarm(alarm.id, !alarm.isActive)}
                      trackColor={{ false: Colors.border, true: Colors.primary }}
                      thumbColor={alarm.isActive ? '#FFFFFF' : Colors.textMuted}
                    />
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
      <TouchableOpacity style={styles.fab} activeOpacity={0.85}>
        <Plus size={24} color="#FFFFFF" />
      </TouchableOpacity>
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
});
