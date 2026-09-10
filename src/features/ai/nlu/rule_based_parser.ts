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

          // Extract task/label by cleaning matched triggers & time phrases
          const extractedTitle = this.extractContent(raw, patternDef.intent);
          if (extractedTitle) {
            entities.title = extractedTitle;
            entities.task = extractedTitle;
          }

          return {
            intent: patternDef.intent,
            confidence: 0.85,
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

    // Strip time phrases from the title
    cleaned = cleaned.replace(
      /(?:lúc|vào|sau)\s+\d{1,2}(?:[:h]| giờ )\d{0,2}(?:\s*(?:phút|sáng|chiều|tối|đêm))?/gi,
      ''
    );
    cleaned = cleaned.replace(/\b\d{1,2}\s*(?:phút|tiếng|giờ)\s*(?:nữa|sau)?/gi, '');
    cleaned = cleaned.replace(/\b(?:sáng mai|ngày mai|tối nay|hôm nay)\b/gi, '');

    cleaned = cleaned.trim().replace(/^[-:,\s]+|[-:,\s]+$/g, '');
    return cleaned.length > 0 ? cleaned : 'Nhắc nhở mới';
  }
}

export const ruleBasedParser = new RuleBasedParser();
