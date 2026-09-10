import { ToneStyle } from '@domain/enums';
import { alarmService } from '@domain/services/alarm_service';
import { reminderService } from '@domain/services/reminder_service';
import { todoService } from '@domain/services/todo_service';
import { notificationService } from '@domain/services/notification_service';
import { responseGenerator } from '@features/ai/response/response_generator';
import { conversationLogDao } from '@data/daos/conversation_log_dao';
import { vietnameseTimeParser } from '@core/utils/vietnamese_time_parser';

export interface ActionRouteInput {
  userInput: string;
  intent: 'setAlarm' | 'setReminder' | 'addTodo' | 'querySchedule' | 'generalQa' | 'unknown';
  entities: Record<string, string>;
  tone: ToneStyle;
  isOffline?: boolean;
  llmMessage?: string;
}

export interface ActionRouteOutput {
  responseText: string;
  actionTaken: boolean;
  intent: string;
}

export class ActionRouter {
  async route(input: ActionRouteInput): Promise<ActionRouteOutput> {
    let responseText = '';
    let actionTaken = false;

    try {
      switch (input.intent) {
        case 'setAlarm': {
          let time = input.entities.time;
          if (!time) {
            const parsed = vietnameseTimeParser.parse(input.userInput);
            if (parsed) {
              time = vietnameseTimeParser.formatTime24h(parsed);
            }
          }

          if (!time) {
            time = '07:00';
          }

          const label = input.entities.label || input.entities.title || 'Báo thức';
          const newAlarm = await alarmService.create({ time, label });

          responseText = responseGenerator.generate({
            tone: input.tone,
            type: 'alarm',
            time: newAlarm.time,
            eventTitle: newAlarm.label,
          });

          await notificationService.scheduleAlarm(newAlarm, responseText);
          actionTaken = true;
          break;
        }

        case 'setReminder': {
          const title = input.entities.title || input.entities.task || 'Lời nhắc mới';
          let remindAt = input.entities.targetDate;

          if (!remindAt) {
            const parsedDate = vietnameseTimeParser.parse(input.userInput);
            remindAt = parsedDate
              ? parsedDate.toISOString()
              : new Date(Date.now() + 15 * 60 * 1000).toISOString();
          }

          const newReminder = await reminderService.create({ title, remindAt });
          const timeFormatted = new Date(newReminder.remindAt).toLocaleTimeString(
            'vi-VN',
            { hour: '2-digit', minute: '2-digit' }
          );

          responseText = responseGenerator.generate({
            tone: input.tone,
            type: 'reminder',
            time: timeFormatted,
            eventTitle: newReminder.title,
          });

          await notificationService.scheduleReminder(newReminder, responseText);
          actionTaken = true;
          break;
        }

        case 'addTodo': {
          const title = input.entities.title || input.entities.task || 'Công việc mới';
          const newTodo = await todoService.create({ title });

          responseText = responseGenerator.generate({
            tone: input.tone,
            type: 'todo',
            eventTitle: newTodo.title,
          });
          actionTaken = true;
          break;
        }

        case 'querySchedule': {
          const [alarms, reminders, todos] = await Promise.all([
            alarmService.getAll(),
            reminderService.getUpcoming(3),
            todoService.getAll(),
          ]);

          const pendingTodos = todos.filter((t) => !t.isDone);
          const nextAlarm = alarms.find((a) => a.isActive);

          let summary = `Hôm nay bạn có ${pendingTodos.length} việc cần làm`;
          if (nextAlarm) {
            summary += `, báo thức kế tiếp lúc ${nextAlarm.time}`;
          }
          if (reminders.length > 0) {
            summary += `, và ${reminders.length} lời nhắc sắp tới`;
          }
          summary += ' nha!';
          responseText = summary;
          actionTaken = true;
          break;
        }

        case 'generalQa': {
          responseText =
            input.llmMessage ||
            'Tôi có thể giúp bạn đặt báo thức, hẹn giờ nhắc việc và quản lý danh sách cần làm. Bạn hãy thử nói xem nhé!';
          actionTaken = false;
          break;
        }

        case 'unknown':
        default: {
          responseText = responseGenerator.generate({
            tone: input.tone,
            type: 'unknown',
          });
          actionTaken = false;
          break;
        }
      }
    } catch (err: unknown) {
      responseText = `Có chút vấn đề khi xử lý: ${
        err instanceof Error ? err.message : 'Không xác định'
      }`;
    }

    // Save to conversation log
    await conversationLogDao.insert({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userInput: input.userInput,
      detectedIntent: input.intent,
      entitiesJson: JSON.stringify(input.entities),
      aiResponse: responseText,
      timestamp: new Date().toISOString(),
      isOffline: !!input.isOffline,
    });

    return {
      responseText,
      actionTaken,
      intent: input.intent,
    };
  }
}

export const actionRouter = new ActionRouter();
