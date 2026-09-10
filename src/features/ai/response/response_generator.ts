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
}

export const responseGenerator = new ResponseGenerator();
