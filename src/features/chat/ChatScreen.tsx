import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { conversationLogDao } from '@data/daos/conversation_log_dao';
import { ConversationLog } from '@domain/entities';
import { ttsService } from '@features/voice/tts_service';
import { voicePipeline } from '@features/voice/voice_pipeline';
import { useSettingsStore } from '@shared/stores/useSettingsStore';
import { Volume2, Sparkles, User, Bot, WifiOff, Send } from 'lucide-react-native';

export const ChatScreen: React.FC = () => {
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { toneStyle } = useSettingsStore();

  const fetchLogs = useCallback(async () => {
    try {
      const recentLogs = await conversationLogDao.getRecent(50);
      setLogs(recentLogs);
    } catch (err) {
      console.error('Failed to load conversation logs', err);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLogs();
    setRefreshing(false);
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;
    setInputText('');
    setIsSending(true);
    try {
      await voicePipeline.processText(trimmed, toneStyle);
      await fetchLogs();
    } catch (err) {
      console.error('Failed to process text command', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleReplay = (text: string) => {
    ttsService.speak(text);
  };

  const formatLogTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <Text style={styles.screenTitle}>Nhật ký Hội thoại AI</Text>
        <Text style={styles.screenSub}>Lịch sử tương tác và câu lệnh giọng nói</Text>

        {logs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bot size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Chưa có hội thoại nào</Text>
            <Text style={styles.emptySub}>
              Hãy nhập câu lệnh hoặc chạm vào biểu tượng micro để bắt đầu trò chuyện!
            </Text>
          </View>
        ) : (
          logs.map((log) => (
            <View key={log.id} style={styles.chatGroup}>
              {/* User Input bubble */}
              <View style={styles.userBubbleWrapper}>
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{log.userInput}</Text>
                </View>
                <View style={styles.userAvatar}>
                  <User size={16} color="#FFFFFF" />
                </View>
              </View>

              {/* AI Response bubble */}
              <View style={styles.aiBubbleWrapper}>
                <View style={styles.aiAvatar}>
                  <Bot size={16} color="#FFFFFF" />
                </View>
                <View style={styles.aiBubble}>
                  <View style={styles.intentHeaderRow}>
                    <View style={styles.intentBadge}>
                      <Sparkles size={12} color={Colors.secondary} />
                      <Text style={styles.intentText}>{log.detectedIntent}</Text>
                    </View>
                    {log.isOffline && (
                      <View style={styles.offlineBadge}>
                        <WifiOff size={11} color={Colors.textMuted} />
                        <Text style={styles.offlineText}>Offline</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.aiText}>{log.aiResponse}</Text>

                  <View style={styles.aiFooter}>
                    <Text style={styles.timestamp}>
                      {formatLogTime(log.timestamp)}
                    </Text>
                    <TouchableOpacity
                      style={styles.ttsBtn}
                      onPress={() => handleReplay(log.aiResponse)}
                      activeOpacity={0.7}
                    >
                      <Volume2 size={16} color={Colors.secondary} />
                      <Text style={styles.ttsText}>Nghe lại</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Text Chat Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="Nhập yêu cầu cho AI (VD: Đặt báo thức 6h)..."
          placeholderTextColor={Colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          editable={!isSending}
          onSubmitEditing={handleSend}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || isSending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!inputText.trim() || isSending}
          accessibilityRole="button"
          accessibilityLabel="Gửi câu lệnh cho AI"
          activeOpacity={0.8}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Send size={18} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
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
  chatGroup: {
    marginBottom: 20,
  },
  userBubbleWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 10,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: '80%',
  },
  userText: {
    ...Typography.bodyLarge,
    color: '#FFFFFF',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  aiBubble: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  intentHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  intentText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: Colors.surfaceSubtle,
  },
  offlineText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
  aiText: {
    ...Typography.bodyLarge,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  aiFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  timestamp: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  ttsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ttsText: {
    ...Typography.labelSmall,
    color: Colors.secondary,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 22,
    paddingHorizontal: 16,
    ...Typography.bodyMedium,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
