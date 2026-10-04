import { IntentType, ToneStyle } from '@domain/enums';
import { alarmService } from '@domain/services/alarm_service';
import { reminderService } from '@domain/services/reminder_service';
import { todoService } from '@domain/services/todo_service';
import { notificationService } from '@domain/services/notification_service';
import { responseGenerator } from '@features/ai/response/response_generator';
import { conversationLogDao } from '@data/daos/conversation_log_dao';
import { vietnameseTimeParser } from '@core/utils/vietnamese_time_parser';
import { ValidationException } from '@core/exceptions/app_exception';
import { useTodoStore } from '@shared/stores/useTodoStore';

export interface ActionRouteInput {
  userInput: string;
  intent: IntentType | 'multiAction';
  entities: Record<string, string>;
  tone: ToneStyle;
  isOffline?: boolean;
  llmMessage?: string;
  signal?: AbortSignal;
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
      this.throwIfAborted(input.signal);
      switch (input.intent) {
        case 'setAlarm': {
          let time = input.entities.time;
          const parsedTime = vietnameseTimeParser.parse(
            input.userInput,
            new Date(),
            { rollPastTimeToTomorrow: false }
          );
          let repeatDays: number[] = [];
          if (input.entities.repeatDays) {
            const val = input.entities.repeatDays.toLowerCase().trim();
            if (val === 'daily') repeatDays = [0, 1, 2, 3, 4, 5, 6];
            else if (val === 'weekdays') repeatDays = [0, 1, 2, 3, 4];
            else if (val === 'weekends') repeatDays = [5, 6];
            else {
              repeatDays = val
                .split(',')
                .map((n) => parseInt(n.trim(), 10))
                .filter((n) => !isNaN(n) && n >= 0 && n <= 6);
            }
          }
          if (repeatDays.length === 0) {
            repeatDays = vietnameseTimeParser.parseRepeatDays(input.userInput);
          }

          if (
            repeatDays.length === 0 &&
            parsedTime &&
            parsedTime.getTime() <= Date.now()
          ) {
            throw new ValidationException(
              'Thời gian báo thức đã qua. Vui lòng chọn thời gian khác hoặc đặt lặp lại.'
            );
          }

          if (!time) {
            if (parsedTime) {
              time = vietnameseTimeParser.formatTime24h(parsedTime);
            }
          }

          if (!time) {
            time = '07:00';
          }

          const label =
            input.entities.label || input.entities.title || 'Báo thức';
          this.throwIfAborted(input.signal);
          const newAlarm = await alarmService.create({
            time,
            label,
            repeatDays,
          });

          responseText = responseGenerator.generate({
            tone: input.tone,
            type: 'alarm',
            time: newAlarm.time,
            eventTitle: newAlarm.label,
          });

          //await notificationService.scheduleAlarm(newAlarm, responseText);
          actionTaken = true;
          break;
        }

        case 'cancelAlarm': {
          this.throwIfAborted(input.signal);
          const alarms = await alarmService.getAll();
          const targetTime = input.entities.time;
          let alarmToCancel = null;
          if (targetTime) {
            alarmToCancel = alarms.find((a) => a.time === targetTime && a.isActive);
          }
          if (!alarmToCancel) {
            alarmToCancel = alarms.find((a) => a.isActive);
          }

          if (alarmToCancel) {
            await alarmService.delete(alarmToCancel.id);
            responseText = `Đã hủy báo thức ${alarmToCancel.time} (${alarmToCancel.label}) cho bạn rồi nhé.`;
            actionTaken = true;
          } else {
            responseText = 'Hiện tại bạn không có báo thức nào đang bật để hủy.';
            actionTaken = false;
          }
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

          this.throwIfAborted(input.signal);
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

          //await notificationService.scheduleReminder(newReminder, responseText);
          actionTaken = true;
          break;
        }

        case 'addTodo': {
          const rawTitle = input.entities.title || input.entities.task || 'Công việc mới';
          const title = rawTitle.charAt(0).toLocaleUpperCase('vi-VN') + rawTitle.slice(1);
          this.throwIfAborted(input.signal);
          const newTodo = await todoService.create({ title });

          responseText = responseGenerator.generate({
            tone: input.tone,
            type: 'todo',
            eventTitle: newTodo.title,
          });
          actionTaken = true;
          break;
        }

        case 'completeTodo': {
          this.throwIfAborted(input.signal);
          const targetTitle = (input.entities.title || input.entities.task || '').trim().toLowerCase();
          const todos = await todoService.getAll();
          const pending = todos.filter((t) => !t.isDone);
          let matched = null;
          if (targetTitle) {
            matched = pending.find((t) => t.title.toLowerCase().includes(targetTitle));
          }
          if (!matched && pending.length > 0) {
            matched = pending[0];
          }

          if (matched) {
            await todoService.toggle(matched.id, true);
            responseText = `Tuyệt vời! Đã đánh dấu hoàn thành công việc: "${matched.title}".`;
            actionTaken = true;
          } else {
            responseText = 'Không tìm thấy công việc phù hợp để hoàn thành.';
            actionTaken = false;
          }
          break;
        }

        case 'editTodo': {
          const oldTitle = input.entities.oldTitle?.trim();
          const newTitle = input.entities.newTitle?.trim();
          if (!oldTitle || !newTitle) {
            responseText = 'Để sửa việc, bạn cho mình biết tên công việc hiện tại và nội dung mới nhé. Ví dụ: “Đổi việc học Java thành học Python”.';
            break;
          }

          const matches = await todoService.findByTitle(oldTitle);
          this.throwIfAborted(input.signal);
          const activeMatches = matches.filter((todo) => !todo.isDone);
          const candidates = activeMatches.length > 0 ? activeMatches : matches;
          if (candidates.length === 0) {
            responseText = `Mình chưa tìm thấy công việc “${oldTitle}”. Bạn kiểm tra lại tên việc giúp mình nhé.`;
            break;
          }
          if (candidates.length > 1) {
            responseText = `Có nhiều công việc tên “${oldTitle}”. Bạn cho mình thêm thông tin để chọn đúng việc nhé.`;
            break;
          }

          this.throwIfAborted(input.signal);
          const updatedTodo = await useTodoStore.getState().updateTodo(
            candidates[0].id,
            { title: newTitle }
          );
          responseText = `Đã đổi công việc “${oldTitle}” thành “${updatedTodo.title}”.`;
          actionTaken = true;
          break;
        }

        case 'querySchedule': {
          const [alarms, reminders, todos] = await Promise.all([
            alarmService.getAll(),
            reminderService.getUpcoming(3),
            todoService.getAll(),
          ]);
          this.throwIfAborted(input.signal);

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
      if (input.signal?.aborted) throw err;
      responseText = `Có chút vấn đề khi xử lý: ${
        err instanceof Error ? err.message : 'Không xác định'
      }`;
    }

    // Save to conversation log
    this.throwIfAborted(input.signal);
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

  private throwIfAborted(signal?: AbortSignal): void {
    if (!signal?.aborted) return;
    const error = new Error('Yêu cầu đã bị hủy.');
    error.name = 'AbortError';
    throw error;
  }
}

export const actionRouter = new ActionRouter();
