import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import {
  ChevronUp,
  ChevronDown,
  Clock,
  Keyboard,
  Grid,
  Sliders,
} from 'lucide-react-native';

export interface TimePickerProps {
  value: string; // "HH:mm" (e.g. "07:00")
  onChange: (time: string) => void;
  mode?: 'alarm' | 'reminder';
  label?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = [
  '00', '05', '10', '15', '20', '25',
  '30', '35', '40', '45', '50', '55',
];

const ALARM_PRESETS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '12:00', '22:00',
];

const REMINDER_PRESETS = [
  '08:00', '09:00', '11:30', '14:00', '17:00', '20:00',
];

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  mode = 'alarm',
  label = 'Chọn thời gian',
}) => {
  const [pickerView, setPickerView] = useState<'stepper' | 'grid'>('stepper');
  const [gridFocus, setGridFocus] = useState<'hour' | 'minute'>('hour');
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  // Parse HH:mm
  const parts = (value || '07:00').split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;

  const formatTime = (h: number, m: number): string => {
    const validH = ((h % 24) + 24) % 24;
    const validM = ((m % 60) + 60) % 60;
    return `${String(validH).padStart(2, '0')}:${String(validM).padStart(2, '0')}`;
  };

  const handleAdjustHour = (delta: number) => {
    onChange(formatTime(hours + delta, minutes));
  };

  const handleAdjustMinute = (delta: number) => {
    onChange(formatTime(hours, minutes + delta));
  };

  const handleSelectHour = (hStr: string) => {
    onChange(formatTime(parseInt(hStr, 10), minutes));
    setGridFocus('minute');
  };

  const handleSelectMinute = (mStr: string) => {
    onChange(formatTime(hours, parseInt(mStr, 10)));
  };

  const handleAddOffset = (offsetMinutes: number) => {
    const now = new Date();
    const future = new Date(now.getTime() + offsetMinutes * 60 * 1000);
    onChange(
      `${String(future.getHours()).padStart(2, '0')}:${String(
        future.getMinutes()
      ).padStart(2, '0')}`
    );
  };

  const getDayPeriod = (h: number) => {
    if (h >= 5 && h < 12) return { text: 'Sáng', emoji: '🌅' };
    if (h >= 12 && h < 18) return { text: 'Chiều', emoji: '☀️' };
    if (h >= 18 && h < 22) return { text: 'Tối', emoji: '🌆' };
    return { text: 'Đêm', emoji: '🌙' };
  };

  const period = getDayPeriod(hours);
  const presets = mode === 'alarm' ? ALARM_PRESETS : REMINDER_PRESETS;

  return (
    <View style={styles.container}>
      {/* Header Row: Label & Mode Toggle */}
      <View style={styles.headerRow}>
        <View style={styles.labelGroup}>
          <Clock size={16} color={Colors.secondary} />
          <Text style={styles.label}>{label}</Text>
        </View>

        <View style={styles.headerActions}>
          {!isKeyboardMode && (
            <TouchableOpacity
              style={styles.modeToggleBtn}
              onPress={() =>
                setPickerView((prev) => (prev === 'stepper' ? 'grid' : 'stepper'))
              }
              accessibilityRole="button"
              accessibilityLabel="Đổi kiểu chọn giờ"
            >
              {pickerView === 'stepper' ? (
                <>
                  <Grid size={14} color={Colors.secondary} />
                  <Text style={styles.modeToggleText}>Chọn số</Text>
                </>
              ) : (
                <>
                  <Sliders size={14} color={Colors.secondary} />
                  <Text style={styles.modeToggleText}>Tăng/Giảm</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.modeToggleBtn}
            onPress={() => setIsKeyboardMode((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel="Đổi chế độ nhập bàn phím"
          >
            {isKeyboardMode ? (
              <>
                <Clock size={14} color={Colors.primary} />
                <Text style={[styles.modeToggleText, { color: Colors.primary }]}>
                  Chọn giờ
                </Text>
              </>
            ) : (
              <>
                <Keyboard size={14} color={Colors.textMuted} />
                <Text style={styles.modeToggleText}>Nhập tay</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Keyboard Input Mode */}
      {isKeyboardMode ? (
        <View style={styles.keyboardModeContainer}>
          <TextInput
            style={styles.keyboardInput}
            value={value}
            onChangeText={onChange}
            placeholder="07:00"
            placeholderTextColor={Colors.textMuted}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            autoFocus
          />
          <Text style={styles.keyboardHint}>
            Nhập định dạng 24h: HH:mm (ví dụ 06:30, 15:45)
          </Text>
        </View>
      ) : (
        <>
          {/* Hero Time Display */}
          <View style={styles.heroDisplayContainer}>
            {/* Hour Block */}
            <View style={styles.timeBlock}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => handleAdjustHour(1)}
                accessibilityRole="button"
                accessibilityLabel="Tăng 1 giờ"
              >
                <ChevronUp size={24} color={Colors.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.digitBox,
                  pickerView === 'grid' &&
                    gridFocus === 'hour' &&
                    styles.digitBoxFocused,
                ]}
                onPress={() => {
                  setPickerView('grid');
                  setGridFocus('hour');
                }}
              >
                <Text style={styles.digitText}>
                  {String(hours).padStart(2, '0')}
                </Text>
                <Text style={styles.digitSubText}>Giờ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => handleAdjustHour(-1)}
                accessibilityRole="button"
                accessibilityLabel="Giảm 1 giờ"
              >
                <ChevronDown size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            {/* Separator */}
            <View style={styles.separatorWrapper}>
              <Text style={styles.separatorText}>:</Text>
            </View>

            {/* Minute Block */}
            <View style={styles.timeBlock}>
              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => handleAdjustMinute(5)}
                accessibilityRole="button"
                accessibilityLabel="Tăng 5 phút"
              >
                <ChevronUp size={24} color={Colors.secondary} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.digitBox,
                  pickerView === 'grid' &&
                    gridFocus === 'minute' &&
                    styles.digitBoxFocused,
                ]}
                onPress={() => {
                  setPickerView('grid');
                  setGridFocus('minute');
                }}
              >
                <Text style={styles.digitText}>
                  {String(minutes).padStart(2, '0')}
                </Text>
                <Text style={styles.digitSubText}>Phút</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.adjustBtn}
                onPress={() => handleAdjustMinute(-5)}
                accessibilityRole="button"
                accessibilityLabel="Giảm 5 phút"
              >
                <ChevronDown size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>

            {/* Period Badge */}
            <View style={styles.periodBadge}>
              <Text style={styles.periodEmoji}>{period.emoji}</Text>
              <Text style={styles.periodText}>{period.text}</Text>
            </View>
          </View>

          {/* Stepper View vs Grid View */}
          {pickerView === 'grid' ? (
            <View style={styles.gridSection}>
              {/* Tab Selector between Hour / Minute */}
              <View style={styles.gridTabRow}>
                <TouchableOpacity
                  style={[
                    styles.gridTabBtn,
                    gridFocus === 'hour' && styles.gridTabBtnActive,
                  ]}
                  onPress={() => setGridFocus('hour')}
                >
                  <Text
                    style={[
                      styles.gridTabText,
                      gridFocus === 'hour' && styles.gridTabTextActive,
                    ]}
                  >
                    Chọn Giờ (0 - 23h)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.gridTabBtn,
                    gridFocus === 'minute' && styles.gridTabBtnActive,
                  ]}
                  onPress={() => setGridFocus('minute')}
                >
                  <Text
                    style={[
                      styles.gridTabText,
                      gridFocus === 'minute' && styles.gridTabTextActive,
                    ]}
                  >
                    Chọn Phút (0 - 55p)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Grid Numbers */}
              <View style={styles.gridWrap}>
                {gridFocus === 'hour'
                  ? HOURS.map((hStr) => {
                      const isSelected = parseInt(hStr, 10) === hours;
                      return (
                        <TouchableOpacity
                          key={hStr}
                          style={[
                            styles.gridCell,
                            isSelected && styles.gridCellActive,
                          ]}
                          onPress={() => handleSelectHour(hStr)}
                        >
                          <Text
                            style={[
                              styles.gridCellText,
                              isSelected && styles.gridCellTextActive,
                            ]}
                          >
                            {hStr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })
                  : MINUTES.map((mStr) => {
                      const isSelected = parseInt(mStr, 10) === minutes;
                      return (
                        <TouchableOpacity
                          key={mStr}
                          style={[
                            styles.gridCell,
                            isSelected && styles.gridCellActive,
                          ]}
                          onPress={() => handleSelectMinute(mStr)}
                        >
                          <Text
                            style={[
                              styles.gridCellText,
                              isSelected && styles.gridCellTextActive,
                            ]}
                          >
                            {mStr}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
              </View>
            </View>
          ) : (
            <>
              {/* Quick Adjustment Steppers */}
              <View style={styles.stepperPillsRow}>
                <TouchableOpacity
                  style={styles.stepperPill}
                  onPress={() => handleAdjustMinute(5)}
                >
                  <Text style={styles.stepperPillText}>+5p</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperPill}
                  onPress={() => handleAdjustMinute(15)}
                >
                  <Text style={styles.stepperPillText}>+15p</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperPill}
                  onPress={() => handleAdjustMinute(30)}
                >
                  <Text style={styles.stepperPillText}>+30p</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.stepperPill}
                  onPress={() => handleAdjustHour(1)}
                >
                  <Text style={styles.stepperPillText}>+1h</Text>
                </TouchableOpacity>
                {mode === 'reminder' && (
                  <TouchableOpacity
                    style={[styles.stepperPill, styles.stepperPillAccent]}
                    onPress={() => handleAddOffset(15)}
                  >
                    <Text style={styles.stepperPillAccentText}>Sau 15p</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Quick Preset Chips */}
              <View style={styles.presetSection}>
                <Text style={styles.presetSectionTitle}>Mốc giờ phổ biến:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.presetScroll}
                >
                  {presets.map((preset) => {
                    const isSelected = value === preset;
                    return (
                      <TouchableOpacity
                        key={preset}
                        style={[
                          styles.presetChip,
                          isSelected && styles.presetChipActive,
                        ]}
                        onPress={() => onChange(preset)}
                      >
                        <Text
                          style={[
                            styles.presetChipText,
                            isSelected && styles.presetChipTextActive,
                          ]}
                        >
                          {preset}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            </>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    ...Typography.labelMedium,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modeToggleText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  keyboardModeContainer: {
    marginVertical: 8,
  },
  keyboardInput: {
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.borderGlow,
  },
  keyboardHint: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  heroDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 12,
  },
  timeBlock: {
    alignItems: 'center',
    gap: 4,
  },
  adjustBtn: {
    width: 36,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 8,
  },
  digitBox: {
    width: 72,
    height: 64,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  digitBoxFocused: {
    borderColor: Colors.primary,
    backgroundColor: 'rgba(99, 102, 241, 0.12)',
  },
  digitText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
    letterSpacing: -0.5,
  },
  digitSubText: {
    fontSize: 10,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginTop: -2,
  },
  separatorWrapper: {
    paddingBottom: 4,
  },
  separatorText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.secondary,
  },
  periodBadge: {
    backgroundColor: Colors.surfaceSubtle,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginLeft: 4,
    minWidth: 54,
  },
  periodEmoji: {
    fontSize: 18,
  },
  periodText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  stepperPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  stepperPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepperPillText: {
    ...Typography.labelSmall,
    color: Colors.secondary,
    fontWeight: '600',
  },
  stepperPillAccent: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderColor: Colors.secondary,
  },
  stepperPillAccentText: {
    ...Typography.labelSmall,
    color: Colors.secondary,
    fontWeight: '700',
  },
  presetSection: {
    marginTop: 8,
  },
  presetSectionTitle: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginBottom: 6,
  },
  presetScroll: {
    gap: 8,
    paddingVertical: 2,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  presetChipActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: Colors.primary,
  },
  presetChipText: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  presetChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  gridSection: {
    marginTop: 10,
  },
  gridTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  gridTabBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridTabBtnActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.16)',
    borderColor: Colors.primary,
  },
  gridTabText: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  gridTabTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'center',
  },
  gridCell: {
    width: 44,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridCellActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  gridCellText: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  gridCellTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
