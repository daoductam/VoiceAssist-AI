import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { ToneStyle } from '@domain/enums';
import { useSettingsStore } from '@shared/stores/useSettingsStore';
import { ttsService } from '@features/voice/tts_service';
import {
  KeyRound,
  CheckCircle2,
  Volume2,
  Sparkles,
  Briefcase,
  Smile,
  ShieldCheck,
  Save,
} from 'lucide-react-native';

export const SettingsScreen: React.FC = () => {
  const {
    toneStyle,
    setToneStyle,
    ttsEnabled,
    setTtsEnabled,
    groqApiKey,
    setGroqApiKey,
    isKeyConfigured,
    loadSettings,
  } = useSettingsStore();

  const [inputKey, setInputKey] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (groqApiKey) {
      setInputKey(groqApiKey);
    }
  }, [groqApiKey]);

  const handleSaveKey = async () => {
    await setGroqApiKey(inputKey);
    Alert.alert('Thành công', 'Đã lưu khóa bí mật Groq API an toàn!');
  };

  const handleToneSelect = (tone: ToneStyle) => {
    setToneStyle(tone);
    if (ttsEnabled) {
      if (tone === 'friendly') {
        ttsService.speak('Chào bạn! Mình là trợ lý thân thiện của bạn nhé!');
      } else if (tone === 'professional') {
        ttsService.speak('Hệ thống trợ lý chuyên nghiệp đã được kích hoạt.');
      } else {
        ttsService.speak('Dạ vâng ạ! Em là trợ lý dễ thương của bạn nè! 💖');
      }
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Cài đặt & Tùy biến</Text>
      <Text style={styles.screenSub}>
        Quản lý trí tuệ nhân tạo, giọng nói và phong cách
      </Text>

      {/* Groq AI Section */}
      <View style={styles.sectionCard}>
        <View style={styles.cardHeader}>
          <KeyRound size={20} color={Colors.primary} />
          <Text style={styles.cardTitle}>Groq Cloud API Key</Text>
        </View>
        <Text style={styles.cardDesc}>
          Dùng để nhận dạng giọng nói tiếng Việt tức thì (Whisper) và phân tích ý
          định siêu tốc (Llama 3.3).
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputKey}
            onChangeText={setInputKey}
            placeholder="gsk_..."
            placeholderTextColor={Colors.textMuted}
            secureTextEntry={true}
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.saveKeyBtn}
            onPress={handleSaveKey}
            activeOpacity={0.8}
          >
            <Save size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusRow}>
          <ShieldCheck
            size={16}
            color={isKeyConfigured ? Colors.success : Colors.warning}
          />
          <Text
            style={[
              styles.statusText,
              !isKeyConfigured && { color: Colors.warning },
            ]}
          >
            {isKeyConfigured
              ? 'Khóa API đã sẵn sàng và được bảo vệ cục bộ'
              : 'Chưa cấu hình API key (sẽ dùng bộ bóc tách offline)'}
          </Text>
        </View>
      </View>

      {/* Tone Style Section */}
      <Text style={styles.sectionHeaderTitle}>Phong cách giọng nói trợ lý</Text>

      {/* Tone Card 1: Friendly */}
      <TouchableOpacity
        style={[
          styles.toneCard,
          toneStyle === 'friendly' && styles.toneCardSelected,
        ]}
        onPress={() => handleToneSelect('friendly')}
        activeOpacity={0.8}
      >
        <View style={styles.toneIconWrapper}>
          <Smile size={24} color={Colors.success} />
        </View>
        <View style={styles.toneTextWrapper}>
          <View style={styles.toneTitleRow}>
            <Text style={styles.toneTitle}>Thân thiện (Friendly)</Text>
            {toneStyle === 'friendly' && (
              <CheckCircle2 size={18} color={Colors.primary} />
            )}
          </View>
          <Text style={styles.toneExample}>
            "Chào buổi sáng! Mình đã đặt chuông 6h30 cho bạn rồi nhé!"
          </Text>
        </View>
      </TouchableOpacity>

      {/* Tone Card 2: Professional */}
      <TouchableOpacity
        style={[
          styles.toneCard,
          toneStyle === 'professional' && styles.toneCardSelected,
        ]}
        onPress={() => handleToneSelect('professional')}
        activeOpacity={0.8}
      >
        <View style={styles.toneIconWrapper}>
          <Briefcase size={24} color={Colors.secondary} />
        </View>
        <View style={styles.toneTextWrapper}>
          <View style={styles.toneTitleRow}>
            <Text style={styles.toneTitle}>Chuyên nghiệp (Professional)</Text>
            {toneStyle === 'professional' && (
              <CheckCircle2 size={18} color={Colors.primary} />
            )}
          </View>
          <Text style={styles.toneExample}>
            "Báo thức đã được thiết lập vào lúc 06:30. Chúc bạn làm việc hiệu quả."
          </Text>
        </View>
      </TouchableOpacity>

      {/* Tone Card 3: Cute */}
      <TouchableOpacity
        style={[
          styles.toneCard,
          toneStyle === 'cute' && styles.toneCardSelected,
        ]}
        onPress={() => handleToneSelect('cute')}
        activeOpacity={0.8}
      >
        <View style={styles.toneIconWrapper}>
          <Sparkles size={24} color={Colors.ambientPink} />
        </View>
        <View style={styles.toneTextWrapper}>
          <View style={styles.toneTitleRow}>
            <Text style={styles.toneTitle}>Dễ thương (Cute)</Text>
            {toneStyle === 'cute' && (
              <CheckCircle2 size={18} color={Colors.primary} />
            )}
          </View>
          <Text style={styles.toneExample}>
            "Dạ vâng ạ! Em đã nhớ giờ rồi nha, chúc bạn ngủ ngoan nè! 💖"
          </Text>
        </View>
      </TouchableOpacity>

      {/* Voice & Speech Options */}
      <Text style={styles.sectionHeaderTitle}>Giọng đọc thiết bị (TTS)</Text>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabelGroup}>
          <Volume2 size={20} color={Colors.secondary} />
          <View>
            <Text style={styles.toggleTitle}>Phát giọng nói phản hồi</Text>
            <Text style={styles.toggleSub}>Đọc to câu trả lời của AI</Text>
          </View>
        </View>
        <Switch
          value={ttsEnabled}
          onValueChange={setTtsEnabled}
          trackColor={{ false: Colors.border, true: Colors.primary }}
          thumbColor={ttsEnabled ? '#FFFFFF' : Colors.textMuted}
        />
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
    paddingBottom: 100,
  },
  screenTitle: {
    ...Typography.titleLarge,
    color: Colors.textPrimary,
  },
  screenSub: {
    ...Typography.bodyMedium,
    color: Colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  cardTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
  },
  cardDesc: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceSubtle,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 4,
    alignItems: 'center',
  },
  textInput: {
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    flex: 1,
    paddingVertical: 8,
  },
  saveKeyBtn: {
    backgroundColor: Colors.primary,
    padding: 8,
    borderRadius: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  statusText: {
    ...Typography.caption,
    color: Colors.success,
    fontWeight: '500',
  },
  sectionHeaderTitle: {
    ...Typography.titleMedium,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  toneCard: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toneCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceElevated,
  },
  toneIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toneTextWrapper: {
    flex: 1,
  },
  toneTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toneTitle: {
    ...Typography.labelLarge,
    color: Colors.textPrimary,
  },
  toneExample: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleTitle: {
    ...Typography.labelLarge,
    color: Colors.textPrimary,
  },
  toggleSub: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
