import type { Alarm, Reminder } from '@domain/entities';
import type { ToneStyle } from '@domain/enums';

export interface NextAlarmInfo {
  alarm: Alarm;
  triggerDate: Date;
  remainingMs: number;
}

/**
 * Calculates the next trigger Date for a given alarm based on current time and repeatDays.
 * Alarm.repeatDays convention: 0 = Mon, 1 = Tue, ..., 6 = Sun
 */
export function getNextAlarmTrigger(alarm: Alarm, now: Date = new Date()): Date {
  const parts = alarm.time.split(':');
  const hour = Number.parseInt(parts[0] || '0', 10);
  const minute = Number.parseInt(parts[1] || '0', 10);

  const targetDate = new Date(now);
  targetDate.setHours(hour, minute, 0, 0);

  // If time has passed today or repeatDays doesn't match today's day of week
  while (
    targetDate.getTime() <= now.getTime() ||
    (alarm.repeatDays.length > 0 &&
      !alarm.repeatDays.includes((targetDate.getDay() + 6) % 7))
  ) {
    targetDate.setDate(targetDate.getDate() + 1);
  }

  return targetDate;
}

/**
 * Finds the active alarm that will ring next in the future.
 */
export function getClosestActiveAlarm(
  alarms: Alarm[],
  now: Date = new Date()
): NextAlarmInfo | null {
  const activeAlarms = alarms.filter((a) => a.isActive);
  if (activeAlarms.length === 0) return null;

  const alarmsWithTrigger: NextAlarmInfo[] = [];

  for (const alarm of activeAlarms) {
    try {
      const triggerDate = getNextAlarmTrigger(alarm, now);
      const remainingMs = Math.max(0, triggerDate.getTime() - now.getTime());
      alarmsWithTrigger.push({ alarm, triggerDate, remainingMs });
    } catch {
      // Ignore malformed alarm items safely
    }
  }

  if (alarmsWithTrigger.length === 0) return null;

  alarmsWithTrigger.sort(
    (a, b) => a.triggerDate.getTime() - b.triggerDate.getTime()
  );

  return alarmsWithTrigger[0];
}

/**
 * Formats remaining duration into a natural Vietnamese countdown.
 * e.g., "Còn 7 giờ 30 phút", "Còn 45 phút", "Dưới 1 phút nữa"
 */
export function formatRemainingCountdown(remainingMs: number): string {
  if (remainingMs <= 0) {
    return 'Sắp reo';
  }

  const totalMinutes = Math.floor(remainingMs / (1000 * 60));
  if (totalMinutes < 1) {
    return 'Dưới 1 phút nữa';
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `Còn ${minutes} phút`;
  }
  if (minutes === 0) {
    return `Còn ${hours} giờ`;
  }
  return `Còn ${hours} giờ ${minutes} phút`;
}

/**
 * Formats a reminder's trigger time in a short, friendly manner.
 */
function formatReminderTimeLabel(remindAt: string, now: Date = new Date()): string {
  const date = new Date(remindAt);
  if (Number.isNaN(date.getTime())) return '';

  const timeStr = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isToday) {
    return `lúc ${timeStr}`;
  }
  if (isTomorrow) {
    return `ngày mai lúc ${timeStr}`;
  }
  return `${date.getDate()}/${date.getMonth() + 1} lúc ${timeStr}`;
}

export interface HeroAiNoteContext {
  nextAlarmInfo: NextAlarmInfo | null;
  nextReminder: Reminder | null;
  toneStyle: ToneStyle;
  now?: Date;
}

/**
 * Generates an empathetic and contextual AI note for the home screen hero card.
 */
export function generateHeroAiNote({
  nextAlarmInfo,
  nextReminder,
  toneStyle,
  now = new Date(),
}: HeroAiNoteContext): string {
  const countdown = nextAlarmInfo
    ? formatRemainingCountdown(nextAlarmInfo.remainingMs)
    : '';
  const inDuration = countdown
    ? countdown
        .replace(/^Còn\s+/i, 'sau ')
        .replace(/^Dưới 1 phút nữa/i, 'sau chưa đầy 1 phút')
        .toLowerCase()
    : '';

  const reminderTime = nextReminder
    ? formatReminderTimeLabel(nextReminder.remindAt, now)
    : '';
  const reminderTitle = nextReminder ? nextReminder.title.trim() : '';

  // 1. Both Next Alarm and Next Reminder exist
  if (nextAlarmInfo && nextReminder && reminderTitle) {
    switch (toneStyle) {
      case 'professional':
        return `✨ Báo thức kế tiếp reo ${inDuration}. Lịch trình: "${reminderTitle}" (${reminderTime}).`;
      case 'cute':
        return `✨ Chuông reo ${inDuration} nè. Đừng quên "${reminderTitle}" ${reminderTime} nha! ✨`;
      case 'friendly':
      default:
        return `✨ Báo thức reo ${inDuration}. Bạn có lịch: "${reminderTitle}" ${reminderTime} nhé!`;
    }
  }

  // 2. Only Next Alarm exists
  if (nextAlarmInfo) {
    switch (toneStyle) {
      case 'professional':
        return `✨ Báo thức đã kích hoạt, sẽ reo ${inDuration}. Không có lịch trình sắp tới.`;
      case 'cute':
        return `✨ Hẹn bạn ${inDuration} nữa chuông sẽ reo nhé! Chúc bạn luôn vui tươi! 💖`;
      case 'friendly':
      default:
        return `✨ Báo thức sẽ reo ${inDuration}. Chúc bạn một ngày tràn đầy năng lượng!`;
    }
  }

  // 3. Only Next Reminder exists
  if (nextReminder && reminderTitle) {
    switch (toneStyle) {
      case 'professional':
        return `✨ Chưa cài báo thức. Lời nhắc tiếp theo: "${reminderTitle}" ${reminderTime}.`;
      case 'cute':
        return `✨ Chưa có báo thức reo đâu, nhưng sắp tới hẹn "${reminderTitle}" ${reminderTime} rồi đó nha!`;
      case 'friendly':
      default:
        return `✨ Bạn có lịch: "${reminderTitle}" ${reminderTime}. Nhấn Orb nếu muốn đặt báo thức nhé!`;
    }
  }

  // 4. Neither Alarm nor Reminder
  switch (toneStyle) {
    case 'professional':
      return '✨ Hệ thống sẵn sàng. Nhấn giữ Voice Orb để thiết lập báo thức hoặc lịch trình.';
    case 'cute':
      return '✨ Thảnh thơi quá ta! Hãy nói "Đặt báo thức 7h sáng" nếu cần tớ gọi dậy nha! 🥰';
    case 'friendly':
    default:
      return '✨ Chưa có lịch trình hay báo thức nào. Chúc bạn có những phút giây thư thái!';
  }
}
