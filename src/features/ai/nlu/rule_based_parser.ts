import { IntentType } from '@domain/enums';
import { VIETNAMESE_INTENT_PATTERNS } from './patterns/vi_patterns';
import { vietnameseTimeParser } from '@core/utils/vietnamese_time_parser';

export interface ParsedIntent {
  intent: IntentType;
  confidence: number;
  entities: Record<string, string>;
  rawText: string;
}

export interface IntentParser {
  parse(text: string): ParsedIntent;
}

export class RuleBasedParser implements IntentParser {
  parseMultiple(text: string): ParsedIntent[] {
    const segments = text
      .split(/\s+(?:và|rồi)\s+/i)
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments.length < 2) return [];

    const parsed = segments.map((segment) => this.parse(segment));
    const actionableIntents: IntentType[] = [
      'setAlarm',
      'cancelAlarm',
      'setReminder',
      'addTodo',
      'completeTodo',
      'editTodo',
    ];
    return parsed.every((item) => actionableIntents.includes(item.intent))
      ? parsed
      : [];
  }

  parse(text: string): ParsedIntent {
    if (!text || text.trim().length === 0) {
      return {
        intent: 'unknown',
        confidence: 0,
        entities: {},
        rawText: text || '',
      };
    }

    const raw = text.trim();
    const normalized = raw.toLowerCase();

    // 1. Try to extract time using VietnameseTimeParser
    const parsedDate = vietnameseTimeParser.parse(normalized);
    const parsedTimeOfDay = vietnameseTimeParser.parseTimeOfDay(normalized);

    // 2. Iterate through patterns sorted by priority
    for (const patternDef of VIETNAMESE_INTENT_PATTERNS) {
      for (const trigger of patternDef.triggers) {
        if (trigger.test(normalized)) {
          const entities: Record<string, string> = {};

          if (parsedDate) {
            entities.targetDate = parsedDate.toISOString();
            entities.time = vietnameseTimeParser.formatTime24h(parsedDate);
          } else if (parsedTimeOfDay) {
            const h = String(parsedTimeOfDay.hours).padStart(2, '0');
            const m = String(parsedTimeOfDay.minutes).padStart(2, '0');
            entities.time = `${h}:${m}`;
          }

          if (patternDef.intent === 'editTodo') {
            const edit = this.extractTodoEdit(raw);
            if (edit.oldTitle) entities.oldTitle = edit.oldTitle;
            if (edit.newTitle) entities.newTitle = edit.newTitle;
          } else {
            // Extract task/label by cleaning matched triggers & time phrases
            const extractedTitle = this.extractContent(raw, patternDef.intent);
            if (extractedTitle) {
              entities.title = extractedTitle;
              entities.task = extractedTitle;
            }
          }

          let confidence = 0.85;
          if (patternDef.intent === 'setAlarm') {
            confidence = entities.time ? 0.95 : 0.7;
          } else if (patternDef.intent === 'cancelAlarm') {
            confidence = 0.92;
          } else if (patternDef.intent === 'setReminder') {
            confidence =
              entities.title && (entities.targetDate || entities.time)
                ? 0.95
                : 0.75;
          } else if (patternDef.intent === 'addTodo') {
            confidence = entities.title ? 0.95 : 0.65;
          } else if (patternDef.intent === 'completeTodo') {
            confidence = entities.title ? 0.92 : 0.7;
          } else if (patternDef.intent === 'querySchedule') {
            confidence = 0.9;
          }

          return {
            intent: patternDef.intent,
            confidence,
            entities,
            rawText: raw,
          };
        }
      }
    }

    // 3. If no pattern matched, but time was clearly detected, fallback to setAlarm or setReminder
    if (parsedDate || parsedTimeOfDay) {
      const timeStr = parsedDate
        ? vietnameseTimeParser.formatTime24h(parsedDate)
        : `${String(parsedTimeOfDay?.hours).padStart(2, '0')}:${String(
            parsedTimeOfDay?.minutes
          ).padStart(2, '0')}`;

      return {
        intent: 'setAlarm',
        confidence: 0.65,
        entities: {
          time: timeStr,
          targetDate: parsedDate ? parsedDate.toISOString() : '',
        },
        rawText: raw,
      };
    }

    return {
      intent: 'unknown',
      confidence: 0,
      entities: {},
      rawText: raw,
    };
  }

  /**
   * Clean keywords to extract the core user task/subject
   */
  private extractContent(text: string, intent: IntentType): string {
    let cleaned = text;

    // Remove time and date details before stripping the command keywords.
    cleaned = cleaned.replace(
      /(?:lúc|vào|sau)\s+\d{1,2}(?:(?:[:h]\s*\d{1,2})|(?:\s*giờ(?:\s*\d{1,2})?))(?:\s*(?:phút|p|sáng|chiều|tối|đêm|trưa))?/gi,
      ''
    );
    cleaned = cleaned.replace(/\b\d{1,2}\s*(?:phút|tiếng|giờ)\s*(?:nữa|sau)?/gi, '');
    cleaned = cleaned.replace(/\b(?:sáng mai|ngày mai|tối nay|hôm nay)\b/gi, '');

    if (intent === 'setAlarm') {
      cleaned = cleaned.replace(
        /(?:đặt|bật|tạo|hẹn)?\s*(?:báo thức|chuông báo|chuông)\s*(?:lúc|vào)?/gi,
        ''
      );
      cleaned = cleaned.replace(
        /(?:gọi|đánh thức)\s*(?:tôi|mình|em)?\s*(?:dậy|thức dậy)\s*(?:lúc|vào)?/gi,
        ''
      );
    } else if (intent === 'setReminder') {
      cleaned = cleaned.replace(
        /(?:nhắc|nhắc nhở|nhớ nhắc)\s*(?:tôi|mình|em)?\s*(?:là|về việc)?/gi,
        ''
      );
      cleaned = cleaned.replace(/(?:đặt|tạo)?\s*lời nhắc\s*/gi, '');
    } else if (intent === 'addTodo') {
      cleaned = cleaned.replace(
        /(?:thêm|tạo|ghi)\s*(?:việc|task|công việc|ghi chú|vào danh sách|todo)\s*(?:là)?/gi,
        ''
      );
      cleaned = cleaned.replace(/(?:nhớ mua|cần mua|cần làm)\s+/gi, '');
    }

    cleaned = cleaned.trim().replace(/^[-:,\s]+|[-:,\s]+$/g, '');
    if (cleaned.length > 0) return cleaned;
    return intent === 'setAlarm' ? '' : 'Nhắc nhở mới';
  }

  private extractTodoEdit(text: string): { oldTitle?: string; newTitle?: string } {
    const match = text.match(
      /(?:đổi|sửa|chỉnh sửa|cập nhật)\s+(?:(?:công\s+)?việc|task|todo|to-do)\s+(.+?)\s+(?:thành|sang)\s+(.+?)\s*[.!?]*$/i
    );
    if (!match) return {};

    const cleanTitle = (title: string) =>
      title.replace(/^[\s"'“”‘’]+|[\s"'“”‘’.,!?]+$/g, '').trim();
    const oldTitle = cleanTitle(match[1]);
    const newTitle = cleanTitle(match[2]);
    return {
      oldTitle: oldTitle || undefined,
      newTitle: newTitle || undefined,
    };
  }
}

export const ruleBasedParser = new RuleBasedParser();
