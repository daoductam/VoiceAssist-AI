import { todoDao } from '@data/daos/todo_dao';
import { reminderDao } from '@data/daos/reminder_dao';
import { useSettingsStore } from '@shared/stores/useSettingsStore';
import { ToneStyle } from '@domain/enums';
import { Todo } from '@domain/entities';

export interface MorningBriefingData {
  greeting: string;
  summary: string;
  tasksCount: number;
  remindersCount: number;
  fullSpeechText: string;
  topTasks: string[];
}

export class MorningBriefingService {
  /**
   * Generates a refreshing, empathetic morning briefing for the user
   */
  async generateBriefing(alarmLabel?: string): Promise<MorningBriefingData> {
    const tone: ToneStyle = useSettingsStore.getState().toneStyle || 'friendly';
    
    // 1. Fetch pending tasks and today's reminders
    const allTodos = await todoDao.getAll();
    const pendingTodos = allTodos.filter((t: Todo) => !t.isDone);
    const allReminders = await reminderDao.getAll();

    // Filter reminders for today
    const now = new Date();
    const todayReminders = allReminders.filter((r) => {
      const rDate = new Date(r.remindAt);
      return (
        rDate.getDate() === now.getDate() &&
        rDate.getMonth() === now.getMonth() &&
        rDate.getFullYear() === now.getFullYear() &&
        !r.isCompleted
      );
    });

    const tasksCount = pendingTodos.length;
    const remindersCount = todayReminders.length;
    const topTasks = pendingTodos.slice(0, 3).map((t: Todo) => t.title);

    // 2. Craft personalized greeting & briefing text based on tone
    let greeting = 'Chào buổi sáng bạn nhé!';
    let speechParts: string[] = [];

    if (tone === 'friendly') {
      greeting = 'Chào buổi sáng tốt lành! ☀️';
      speechParts.push('Chào buổi sáng! Rất vui được gặp lại bạn ngày hôm nay.');

      if (tasksCount > 0 || remindersCount > 0) {
        speechParts.push(
          `Hôm nay bạn có ${tasksCount > 0 ? `${tasksCount} việc cần làm` : ''}${
            tasksCount > 0 && remindersCount > 0 ? ' và ' : ''
          }${remindersCount > 0 ? `${remindersCount} lời nhắc nhở` : ''}.`
        );
        if (topTasks.length > 0) {
          speechParts.push(`Ưu tiên hàng đầu là: ${topTasks.join(', ')}.`);
        }
      } else {
        speechParts.push(
          'Lịch trình hôm nay của bạn đang rất thảnh thơi. Hãy tận hưởng một ngày thật tuyệt vời nhé!'
        );
      }
      speechParts.push('Chúc bạn một ngày mới tràn ngập năng lượng và may mắn!');
    } else if (tone === 'professional') {
      greeting = 'Chào buổi sáng. Bắt đầu ngày mới.';
      speechParts.push('Kính chào bạn. Hệ thống VoiceAssist đã sẵn sàng cho ngày làm việc mới.');

      if (tasksCount > 0 || remindersCount > 0) {
        speechParts.push(
          `Báo cáo lịch trình: Bạn có ${tasksCount} mục công việc đang chờ và ${remindersCount} lịch nhắc nhở.`
        );
        if (topTasks.length > 0) {
          speechParts.push(`Nhiệm vụ trọng tâm: ${topTasks.join(', ')}.`);
        }
      } else {
        speechParts.push('Hôm nay chưa có đầu việc nào được lên lịch.');
      }
      speechParts.push('Chúc bạn một ngày làm việc hiệu quả và đạt nhiều thành tựu.');
    } else {
      // Cute tone
      greeting = 'Chào buổi sáng dễ thương nha! 💖';
      speechParts.push('Chào buổi sáng nha! Em chúc bạn thức dậy thật sảng khoái và vui vẻ nè!');

      if (tasksCount > 0 || remindersCount > 0) {
        speechParts.push(
          `Hôm nay bạn có ${tasksCount} việc cần làm đó nha, cố lên nè!`
        );
        if (topTasks.length > 0) {
          speechParts.push(`Những việc quan trọng nè: ${topTasks.join(', ')}.`);
        }
      } else {
        speechParts.push('Hôm nay lịch trống nè, tha hồ thư giãn nha bạn ơi!');
      }
      speechParts.push('Bạn nhớ uống nước ấm và ăn sáng đầy đủ nhé! Yêu bạn nhiều!');
    }

    const fullSpeechText = speechParts.join(' ');
    const summary =
      tasksCount > 0
        ? `Bạn có ${tasksCount} công việc & ${remindersCount} lời nhắc hôm nay.`
        : 'Lịch trình hôm nay của bạn đang rất thảnh thơi.';

    return {
      greeting,
      summary,
      tasksCount,
      remindersCount,
      fullSpeechText,
      topTasks,
    };
  }
}

export const morningBriefingService = new MorningBriefingService();
