export interface ParsedTimeResult {
  hours: number;
  minutes: number;
  date: Date;
  formattedTime: string; // "HH:mm"
}

export class VietnameseTimeParser {
  /**
   * Parse a natural language Vietnamese string to extract Date/Time
   */
  parse(text: string, referenceTime: Date = new Date()): Date | null {
    if (!text || text.trim().length === 0) {
      return null;
    }

    const normalized = text.toLowerCase().trim();

    // 1. Check relative duration: "X phút nữa", "X tiếng nữa", "nửa tiếng nữa"
    const relativeResult = this.parseRelativeDuration(normalized, referenceTime);
    if (relativeResult) {
      return relativeResult;
    }

    // 2. Check time of day: "6 giờ sáng", "6h30", "3 rưỡi chiều", etc.
    const timeOfDay = this.parseTimeOfDay(normalized);
    if (!timeOfDay) {
      return null;
    }

    const targetDate = new Date(referenceTime);
    targetDate.setHours(timeOfDay.hours, timeOfDay.minutes, 0, 0);

    // Determine target day (today, tomorrow, etc.)
    const isTomorrow =
      normalized.includes('ngày mai') ||
      normalized.includes('sáng mai') ||
      normalized.includes('tối mai') ||
      normalized.includes('mai');

    const isDayAfterTomorrow =
      normalized.includes('ngày kia') || normalized.includes('ngày mốt');

    if (isDayAfterTomorrow) {
      targetDate.setDate(targetDate.getDate() + 2);
    } else if (isTomorrow) {
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      // If no explicit day mentioned and target time has already passed today, assume tomorrow
      if (targetDate.getTime() <= referenceTime.getTime()) {
        targetDate.setDate(targetDate.getDate() + 1);
      }
    }

    return targetDate;
  }

  /**
   * Extract hours and minutes from text
   */
  parseTimeOfDay(text: string): { hours: number; minutes: number } | null {
    if (!text) return null;
    const normalized = text.toLowerCase().trim();

    // Patterns like: "6h30", "06:30", "6 giờ 30", "6 rưỡi"
    const hourMinuteRegex =
      /(\d{1,2})(?:[:h]| giờ )(\d{1,2})?(?:\s*(phút|p))?/;
    const halfRegex = /(\d{1,2})\s*(?:giờ|h)?\s*(?:rưỡi|ruoi)/;
    const hourOnlyRegex = /(?:lúc\s+)?(\d{1,2})\s*(?:giờ|h\b)/;

    let hours: number | null = null;
    let minutes = 0;

    const halfMatch = normalized.match(halfRegex);
    if (halfMatch) {
      hours = parseInt(halfMatch[1], 10);
      minutes = 30;
    } else {
      const hmMatch = normalized.match(hourMinuteRegex);
      if (hmMatch) {
        hours = parseInt(hmMatch[1], 10);
        minutes = hmMatch[2] ? parseInt(hmMatch[2], 10) : 0;
      } else {
        const hMatch = normalized.match(hourOnlyRegex);
        if (hMatch) {
          hours = parseInt(hMatch[1], 10);
          minutes = 0;
        }
      }
    }

    if (hours === null || isNaN(hours)) {
      return null;
    }

    // Handle Vietnamese AM/PM period modifiers
    const isAfternoon = normalized.includes('chiều');
    const isEvening = normalized.includes('tối');
    const isNight = normalized.includes('đêm');
    const isMorning = normalized.includes('sáng');
    const isNoon = normalized.includes('trưa');

    if (isAfternoon || isEvening || isNight) {
      // e.g. "3 giờ chiều" -> 15:00, "8 giờ tối" -> 20:00
      if (hours < 12) {
        hours += 12;
      }
    } else if (isMorning) {
      // e.g. "12 giờ sáng" -> 00:00
      if (hours === 12) {
        hours = 0;
      }
    } else if (isNoon) {
      if (hours < 11) {
        hours += 12;
      }
    }

    // Validation
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      return null;
    }

    return { hours, minutes };
  }

  /**
   * Parse relative time: "X phút nữa", "X tiếng nữa", "nửa tiếng nữa"
   */
  private parseRelativeDuration(
    text: string,
    referenceTime: Date
  ): Date | null {
    // "nửa tiếng nữa" / "nửa giờ nữa"
    if (text.includes('nửa tiếng') || text.includes('nửa giờ')) {
      return new Date(referenceTime.getTime() + 30 * 60 * 1000);
    }

    // "X phút nữa" / "X phut"
    const minuteMatch = text.match(/(\d+)\s*(?:phút|phut|p)\s*(?:nữa|nua)?/);
    if (minuteMatch && (text.includes('nữa') || text.includes('sau'))) {
      const minutes = parseInt(minuteMatch[1], 10);
      return new Date(referenceTime.getTime() + minutes * 60 * 1000);
    }

    // "X tiếng nữa" / "X giờ nữa"
    const hourMatch = text.match(/(\d+)\s*(?:tiếng|tieng|giờ|gio|h)\s*(?:nữa|nua)?/);
    if (hourMatch && (text.includes('nữa') || text.includes('sau'))) {
      const hours = parseInt(hourMatch[1], 10);
      return new Date(referenceTime.getTime() + hours * 60 * 60 * 1000);
    }

    return null;
  }

  /**
   * Helper to format time into "HH:mm"
   */
  formatTime24h(date: Date): string {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  }
}

export const vietnameseTimeParser = new VietnameseTimeParser();
