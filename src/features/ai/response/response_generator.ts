import { ToneStyle } from '@domain/enums';
import { FRIENDLY_TEMPLATES } from './templates/friendly_templates';
import { PROFESSIONAL_TEMPLATES } from './templates/professional_templates';
import { CUTE_TEMPLATES } from './templates/cute_templates';

export interface ResponseContext {
  tone: ToneStyle;
  type: 'alarm' | 'reminder' | 'todo' | 'wakeUp' | 'unknown';
  eventTitle?: string;
  time?: string;
  remaining?: string;
  taskCount?: number;
}

export class ResponseGenerator {
  private getTemplatePool(tone: ToneStyle) {
    switch (tone) {
      case 'friendly':
        return FRIENDLY_TEMPLATES;
      case 'professional':
        return PROFESSIONAL_TEMPLATES;
      case 'cute':
      default:
        return CUTE_TEMPLATES;
    }
  }

  private getRandomItem(list: string[]): string {
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  generate(context: ResponseContext): string {
    const pool = this.getTemplatePool(context.tone);
    let templateList: string[] = [];

    switch (context.type) {
      case 'alarm':
        templateList = pool.alarmConfirm;
        break;
      case 'reminder':
        templateList = pool.reminderConfirm;
        break;
      case 'todo':
        templateList = pool.todoConfirm;
        break;
      case 'wakeUp':
        templateList = pool.wakeUpGreeting;
        break;
      case 'unknown':
      default:
        templateList = pool.unknown;
        break;
    }

    const rawTemplate = this.getRandomItem(templateList);

    // Variable substitutions
    const formatted = rawTemplate
      .replace(/\{title\}/g, context.eventTitle || 'việc cần làm')
      .replace(/\{time\}/g, context.time || 'thời gian đã chọn')
      .replace(/\{remaining\}/g, context.remaining || '')
      .replace(/\{taskCount\}/g, String(context.taskCount ?? 0));

    return formatted;
  }

  generateAlarmGreeting(tone: ToneStyle, taskCount: number = 0): string {
    return this.generate({
      tone,
      type: 'wakeUp',
      taskCount,
    });
  }

  /**
   * Generates rich title, notification body, and spoken voice text for an Alarm
   * Adapts dynamically based on time of day (morning, afternoon, evening, night) and tone.
   */
  generateAlarmAlert(
    label: string,
    time: string,
    tone: ToneStyle = 'friendly'
  ): { title: string; body: string; spokenText: string } {
    const cleanLabel = label && label.trim().length > 0 ? label.trim() : 'Báo thức';
    let hour = 7;
    const parts = time.split(':');
    if (parts.length >= 1) {
      const parsedHour = parseInt(parts[0], 10);
      if (!isNaN(parsedHour)) hour = parsedHour;
    }

    if (tone === 'professional') {
      if (hour >= 5 && hour <= 10) {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Kính chào bạn, đã ${time} rồi. Hãy bắt đầu ngày làm việc mới thật hiệu quả nhé!`,
          spokenText: `Kính chào bạn, bây giờ là ${time}. Đã đến giờ báo thức ${cleanLabel}. Chúc bạn một ngày làm việc thành công và nhiều năng lượng!`,
        };
      } else if (hour >= 11 && hour <= 13) {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Đã đến giờ ${time} - ${cleanLabel}. Đã đến giờ nghỉ trưa và nạp năng lượng.`,
          spokenText: `Đã ${time} rồi, báo thức cho ${cleanLabel}. Bạn hãy dành thời gian ăn trưa và nghỉ ngơi nhé.`,
        };
      } else if (hour >= 14 && hour <= 17) {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Đã đến giờ ${time} - ${cleanLabel}. Hãy tập trung hoàn thành các mục tiêu công việc nhé.`,
          spokenText: `Bây giờ là ${time}, đã đến giờ ${cleanLabel}. Hãy tiếp tục hoàn thành các mục tiêu trong ngày nhé!`,
        };
      } else {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Đã đến giờ ${time} - ${cleanLabel}. Chúc bạn buổi tối thư giãn và ấm cúng.`,
          spokenText: `Bây giờ là ${time}, báo thức cho ${cleanLabel}. Chúc bạn một buổi tối thư giãn bên gia đình nhé.`,
        };
      }
    }

    if (tone === 'cute') {
      if (hour >= 5 && hour <= 10) {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Bạn ơi dậy chưaaa! Đã ${time} rồi nè. Mau mở mắt chào ngày mới với mình nào! ✨`,
          spokenText: `Bạn ơi dậy chưaaa! Đã ${time} rồi đó nha. Mau mau mở mắt ra chào ngày mới nào, hôm nay sẽ là một ngày siêu tuyệt vời luôn đó!`,
        };
      } else if (hour >= 11 && hour <= 13) {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Đã ${time} rồi nè! Đến giờ ${cleanLabel}. Mau ăn trưa cho no bụng nha! 🍲`,
          spokenText: `Ting ting! Đã ${time} rồi nè bạn ơi! Đến giờ ${cleanLabel} rồi đó. Nhớ ăn một bữa trưa thật ngon miệng nha!`,
        };
      } else if (hour >= 14 && hour <= 17) {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Ò ó o! Đã ${time} rồi! Đến giờ làm ${cleanLabel} rồi á, cố lên nè! 🐾`,
          spokenText: `Ting ting! Đã ${time} rồi bạn ơi! Đến giờ ${cleanLabel} rồi đó. Cố gắng lên nha, mình luôn ở đây cổ vũ bạn nè!`,
        };
      } else {
        return {
          title: `⏰ ${time} • ${cleanLabel}`,
          body: `Đã ${time} rồi nè! Nhớ ${cleanLabel} rồi nghỉ ngơi sớm đi nha! 🌸`,
          spokenText: `Đã ${time} rồi bạn yêu ơi! Nhớ ${cleanLabel} nhé. Xong việc thì nghỉ ngơi sớm nha, đừng để mắt mỏi đó!`,
        };
      }
    }

    // Default: 'friendly'
    if (hour >= 5 && hour <= 10) {
      return {
        title: `⏰ ${time} • ${cleanLabel}`,
        body: `Chào buổi sáng bạn nhé! Đã ${time} rồi. Dậy thôi nào, ngày mới rạng rỡ đang chờ bạn! ☀️`,
        spokenText: `Chào buổi sáng bạn nhé! Đã ${time} rồi, thức dậy thôi nào! Một ngày mới thật tuyệt vời đang chờ đón bạn. Vươn vai chào ngày mới nào!`,
      };
    } else if (hour >= 11 && hour <= 13) {
      return {
        title: `⏰ ${time} • ${cleanLabel}`,
        body: `Đã ${time} rồi nè! Đến giờ ${cleanLabel}. Nghỉ tay ăn trưa và thư giãn một chút nha! 🍲`,
        spokenText: `Đã ${time} rồi bạn ơi! Đến giờ ${cleanLabel}. Hãy nghỉ tay, thưởng thức bữa trưa ngon miệng và nạp lại năng lượng nhé!`,
      };
    } else if (hour >= 14 && hour <= 17) {
      return {
        title: `⏰ ${time} • ${cleanLabel}`,
        body: `Ting ting! Đã ${time} rồi. Đến giờ ${cleanLabel}. Uống ngụm nước rồi tiếp tục nhé! ☕`,
        spokenText: `Ting ting! Đã ${time} rồi bạn ơi. Đến giờ ${cleanLabel} rồi nè! Hãy vươn vai, uống một ngụm nước và tiếp tục hoàn thành thật tốt nhé!`,
      };
    } else {
      return {
        title: `⏰ ${time} • ${cleanLabel}`,
        body: `Đã ${time} rồi nha! Đến giờ ${cleanLabel}. Nhớ chú ý thời gian và giữ sức khỏe nhé! 🌙`,
        spokenText: `Đã ${time} rồi bạn ơi, đến giờ ${cleanLabel} rồi nè! Nhớ chú ý thời gian và đừng làm việc quá khuya nha!`,
      };
    }
  }

  /**
   * Generates rich title, notification body, and spoken voice text for a Reminder
   */
  generateReminderAlert(
    title: string,
    time: string,
    tone: ToneStyle = 'friendly'
  ): { title: string; body: string; spokenText: string } {
    const cleanTitle = title && title.trim().length > 0 ? title.trim() : 'Việc cần làm';

    if (tone === 'professional') {
      return {
        title: `🔔 ${time} • ${cleanTitle}`,
        body: `Thông báo nhắc việc: "${cleanTitle}". Vui lòng kiểm tra và xử lý.`,
        spokenText: `Xin thông báo, bây giờ là ${time}, đã đến thời gian cho công việc: ${cleanTitle}. Chúc bạn hoàn thành công việc thuận lợi.`,
      };
    }

    if (tone === 'cute') {
      return {
        title: `🔔 ${time} • ${cleanTitle}`,
        body: `Ting ting! Đến giờ làm "${cleanTitle}" rồi bạn ơi! Làm xong mình khen nè! 💖`,
        spokenText: `Bạn ơi, đã ${time} rồi kìa! Đến giờ làm ${cleanTitle} rồi nha. Mau hoàn thành nhé, mình tin bạn làm siêu đỉnh luôn!`,
      };
    }

    // Default: 'friendly'
    return {
      title: `🔔 ${time} • ${cleanTitle}`,
      body: `Nhắc bạn: Đã đến giờ "${cleanTitle}" rồi nè! Hãy dành ít phút hoàn thành nhé! 📌`,
      spokenText: `Bạn ơi, đã ${time} rồi! Đến giờ thực hiện lời nhắc: ${cleanTitle}. Hãy dành chút thời gian hoàn thành ngay nhé!`,
    };
  }
}

export const responseGenerator = new ResponseGenerator();
