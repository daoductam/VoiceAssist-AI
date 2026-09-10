import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '@core/theme/colors';
import { Typography } from '@core/theme/typography';
import { Volume2, Sparkles, User, Bot } from 'lucide-react-native';

interface DemoLog {
  id: string;
  userInput: string;
  intent: string;
  aiResponse: string;
  time: string;
}

export const ChatScreen: React.FC = () => {
  const logs: DemoLog[] = [
    {
      id: '1',
      userInput: 'Gọi tôi dậy lúc 6 rưỡi sáng mai nhé',
      intent: 'setAlarm: 06:30',
      aiResponse:
        'Vâng ạ! Mình đã đặt báo thức lúc 06:30 sáng mai cho bạn rồi nha. Chúc bạn ngủ thật ngon giấc! 🌙',
      time: '21:15',
    },
    {
      id: '2',
      userInput: 'Hôm nay trời có mưa không?',
      intent: 'generalQa: weather',
      aiResponse:
        'Hôm nay thời tiết rất dễ chịu bạn nha, khoảng 27°C, trời nhiều mây nhẹ và không có mưa đâu ạ!',
      time: '07:30',
    },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.screenTitle}>Nhật ký Hội thoại AI</Text>
      <Text style={styles.screenSub}>Lịch sử tương tác và câu lệnh giọng nói</Text>

      {logs.map((log) => (
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
              <View style={styles.intentBadge}>
                <Sparkles size={12} color={Colors.secondary} />
                <Text style={styles.intentText}>{log.intent}</Text>
              </View>
              <Text style={styles.aiText}>{log.aiResponse}</Text>
              <View style={styles.aiFooter}>
                <Text style={styles.timestamp}>{log.time}</Text>
                <TouchableOpacity style={styles.ttsBtn} activeOpacity={0.7}>
                  <Volume2 size={16} color={Colors.secondary} />
                  <Text style={styles.ttsText}>Nghe lại</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      ))}
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
  chatGroup: {
    marginBottom: 24,
  },
  userBubbleWrapper: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
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
  intentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceElevated,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  intentText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.secondary,
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
});
