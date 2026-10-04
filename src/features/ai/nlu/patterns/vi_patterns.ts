import { IntentType } from '@domain/enums';

export interface IntentPatternDefinition {
  intent: IntentType;
  triggers: RegExp[];
  priority: number;
}

export const VIETNAMESE_INTENT_PATTERNS: IntentPatternDefinition[] = [
  // 0. Cancel Alarm (higher priority than setAlarm to catch "hủy báo thức")
  {
    intent: 'cancelAlarm',
    priority: 105,
    triggers: [
      /(?:hủy|tắt|xóa|dừng|bỏ)\s*(?:báo thức|chuông báo|chuông)/i,
    ],
  },

  // 1. Set Alarm
  {
    intent: 'setAlarm',
    priority: 100,
    triggers: [
      /(?:đặt|bật|tạo|hẹn)?\s*(?:báo thức|chuông báo|chuông)\s*(?:lúc|vào)?/i,
      /(?:gọi|đánh thức)\s*(?:tôi|mình|em)?\s*(?:dậy|thức dậy)\s*(?:lúc|vào)?/i,
      /(?:hẹn giờ dậy|báo thức)\s*/i,
    ],
  },

  // 2. Set Reminder
  {
    intent: 'setReminder',
    priority: 90,
    triggers: [
      /(?:nhắc|nhắc nhở|nhớ nhắc)\s*(?:tôi|mình|em)?\s*/i,
      /(?:đặt|tạo)?\s*lời nhắc\s*/i,
      /(?:hẹn giờ)\s+(?!dậy)/i,
    ],
  },

  // 3. Edit Todo
  {
    intent: 'editTodo',
    priority: 85,
    triggers: [
      /(?:đổi|sửa|chỉnh sửa|cập nhật)\s+(?:việc|công việc|task|todo|to-do)(?=\s|$|[,!.?])/i,
    ],
  },

  // 3.5 Complete Todo
  {
    intent: 'completeTodo',
    priority: 82,
    triggers: [
      /(?:hoàn thành|làm xong|đã làm xong|đã xong|check xong|tích xong)\s+(?:việc|công việc|task|todo)?/i,
    ],
  },

  // 4. Add Todo
  {
    intent: 'addTodo',
    priority: 80,
    triggers: [
      /(?:thêm|tạo|ghi)\s*(?:việc|task|công việc|ghi chú|vào danh sách|todo)/i,
      /(?:danh sách cần làm|việc cần làm)\s*(?:là|thêm)?/i,
      /(?:nhớ mua|cần mua|cần làm)\s+/i,
    ],
  },

  // 5. Query Schedule
  {
    intent: 'querySchedule',
    priority: 70,
    triggers: [
      /(?:hôm nay|ngày mai)?\s*(?:có lịch gì|lịch hôm nay|lịch trình|có việc gì)/i,
      /(?:kiểm tra|xem)\s*(?:lịch|danh sách việc|báo thức)/i,
      /(?:mấy giờ có hẹn|lịch hẹn)/i,
    ],
  },

  // 6. General Q&A
  {
    intent: 'generalQa',
    priority: 50,
    triggers: [
      /(?:thời tiết|nhiệt độ|trời có mưa không)/i,
      /(?:mấy giờ rồi|bây giờ là mấy giờ)/i,
      /(?:chào bạn|xin chào|bạn là ai|trợ lý)/i,
    ],
  },
];
