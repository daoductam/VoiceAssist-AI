import { ToneStyle } from '@domain/enums';
import { sttService } from './stt_service';
import { ttsService } from './tts_service';
import { groqClient, UserContextSnapshot } from '@features/ai/groq/groq_client';
import { ruleBasedParser } from '@features/ai/nlu/rule_based_parser';
import { actionRouter, ActionRouteOutput } from './action_router';
import { alarmService } from '@domain/services/alarm_service';
import { reminderService } from '@domain/services/reminder_service';
import { todoService } from '@domain/services/todo_service';

export interface VoiceResult extends ActionRouteOutput {
  transcription: string;
}

export class VoicePipeline {
  private activeController: AbortController | null = null;

  async startListening(): Promise<void> {
    await this.cancelCurrentRequest();
    const controller = new AbortController();
    this.activeController = controller;
    // Stop any existing TTS speech
    await ttsService.stop();
    this.throwIfAborted(controller.signal);
    try {
      await sttService.startRecording(controller.signal);
    } catch (error) {
      if (this.activeController === controller) this.activeController = null;
      throw error;
    }
  }

  async cancelCurrentRequest(): Promise<void> {
    const controller = this.activeController;
    this.activeController = null;
    controller?.abort();
    await Promise.all([sttService.cancelRecording(), ttsService.stop()]);
  }

  async stopListeningAndProcess(
    tone: ToneStyle = 'cute',
    ttsEnabled: boolean = true,
    onSpeechStateChange?: (state: 'speaking' | 'idle') => void
  ): Promise<VoiceResult> {
    const controller = this.activeController;
    if (!controller) throw new Error('Không có yêu cầu giọng nói đang xử lý.');
    const { signal } = controller;

    try {
      // 1. STT: Transcribe audio to text via Groq Whisper
      const transcription = await sttService.stopRecordingAndTranscribe(signal);
      this.throwIfAborted(signal);

      if (!transcription || transcription.trim().length === 0) {
        const emptyResponse = 'Tôi chưa nghe rõ bạn nói gì, bạn nói lại giúp tôi nhé!';
        if (ttsEnabled) {
          onSpeechStateChange?.('speaking');
          try {
            await ttsService.speak(emptyResponse);
          } finally {
            onSpeechStateChange?.('idle');
          }
        }
        return {
          transcription: '',
          responseText: emptyResponse,
          actionTaken: false,
          intent: 'unknown',
        };
      }

      const compoundCommands = ruleBasedParser.parseMultiple(transcription);
      if (compoundCommands.length > 1) {
        const missingDetails = compoundCommands.flatMap((command) => {
          if (command.intent === 'setAlarm' && !command.entities.time) {
            return ['giờ báo thức'];
          }
          if (command.intent === 'setReminder') {
            const missing: string[] = [];
            if (!command.entities.title?.trim()) missing.push('nội dung lời nhắc');
            if (!command.entities.targetDate) missing.push('thời gian lời nhắc');
            return missing;
          }
          if (command.intent === 'addTodo' && !command.entities.title?.trim()) {
            return ['nội dung Todo'];
          }
          if (command.intent === 'editTodo' &&
            (!command.entities.oldTitle?.trim() || !command.entities.newTitle?.trim())) {
            return ['tên Todo cũ và nội dung Todo mới'];
          }
          return [];
        });

        let compoundResult: ActionRouteOutput;
        if (missingDetails.length > 0) {
          const uniqueMissing = [...new Set(missingDetails)];
          compoundResult = await actionRouter.route({
            userInput: transcription,
            intent: 'generalQa',
            entities: {},
            tone,
            isOffline: true,
            llmMessage: `Mình chưa thực hiện yêu cầu vì còn thiếu ${uniqueMissing.join(' và ')}. Bạn bổ sung thông tin giúp mình nhé.`,
            signal,
          });
        } else {
          const results: ActionRouteOutput[] = [];
          for (const command of compoundCommands) {
            this.throwIfAborted(signal);
            results.push(await actionRouter.route({
              userInput: command.rawText,
              intent: command.intent,
              entities: command.entities,
              tone,
              isOffline: true,
              signal,
            }));
          }
          compoundResult = {
            responseText: results.map((result) => result.responseText).join(' '),
            actionTaken: results.every((result) => result.actionTaken),
            intent: 'multiAction',
          };
        }

        this.throwIfAborted(signal);
        if (ttsEnabled && compoundResult.responseText) {
          onSpeechStateChange?.('speaking');
          try {
            await ttsService.speak(compoundResult.responseText);
          } finally {
            onSpeechStateChange?.('idle');
          }
        }
        this.throwIfAborted(signal);
        return { transcription, ...compoundResult };
      }

      // 2. Intent Routing: Hybrid Fast-Path & Context-Aware Smart-Path
      let routeResult: ActionRouteOutput;

      const offlineParsed = ruleBasedParser.parse(transcription);
      const isFastPath =
        offlineParsed.confidence >= 0.9 &&
        ((offlineParsed.intent === 'setAlarm' && !!offlineParsed.entities.time) ||
          offlineParsed.intent === 'cancelAlarm' ||
          (offlineParsed.intent === 'setReminder' &&
            !!offlineParsed.entities.title &&
            !!offlineParsed.entities.targetDate) ||
          (offlineParsed.intent === 'addTodo' &&
            !!offlineParsed.entities.title) ||
          (offlineParsed.intent === 'completeTodo' &&
            !!offlineParsed.entities.title));

      if (isFastPath) {
        // FAST-PATH: Instant local execution (10-20ms)
        routeResult = await actionRouter.route({
          userInput: transcription,
          intent: offlineParsed.intent,
          entities: offlineParsed.entities,
          tone,
          isOffline: false,
          signal,
        });
      } else {
        // SMART-PATH: Online Groq LLM with Context-Aware Function Calling
        try {
          let contextSnapshot: UserContextSnapshot | undefined;
          try {
            const [alarms, reminders, todos] = await Promise.all([
              alarmService.getAll(),
              reminderService.getUpcoming(1),
              todoService.getAll(),
            ]);
            const activeAlarms = alarms.filter((a) => a.isActive);
            const closestAlarm =
              activeAlarms.length > 0 ? activeAlarms[0] : null;
            const pendingTodos = todos.filter((t) => !t.isDone);
            const nextRem = reminders.length > 0 ? reminders[0] : null;

            contextSnapshot = {
              nextAlarmTime: closestAlarm?.time ?? null,
              nextAlarmLabel: closestAlarm?.label ?? null,
              activeAlarmCount: activeAlarms.length,
              pendingTodoCount: pendingTodos.length,
              nextReminderTitle: nextRem?.title ?? null,
              nextReminderTime: nextRem
                ? new Date(nextRem.remindAt).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : null,
              toneStyle: tone,
            };
          } catch {
            // Ignore context fetching errors
          }

          const llmResult = await groqClient.parseIntentWithLlm(
            transcription,
            contextSnapshot,
            signal
          );
          this.throwIfAborted(signal);

          if (llmResult.toolName === 'set_alarm') {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'setAlarm',
              entities: llmResult.parameters,
              tone,
              signal,
            });
          } else if (llmResult.toolName === 'cancel_alarm') {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'cancelAlarm',
              entities: llmResult.parameters,
              tone,
              signal,
            });
          } else if (llmResult.toolName === 'set_reminder') {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'setReminder',
              entities: llmResult.parameters,
              tone,
              signal,
            });
          } else if (llmResult.toolName === 'add_todo') {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'addTodo',
              entities: llmResult.parameters,
              tone,
              signal,
            });
          } else if (llmResult.toolName === 'complete_todo') {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'completeTodo',
              entities: llmResult.parameters,
              tone,
              signal,
            });
          } else if (llmResult.toolName === 'edit_todo') {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'editTodo',
              entities: llmResult.parameters,
              tone,
              signal,
            });
          } else if (llmResult.toolName === 'query_schedule') {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'querySchedule',
              entities: llmResult.parameters,
              tone,
              signal,
            });
          } else if (llmResult.message && llmResult.message.trim().length > 0) {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: 'generalQa',
              entities: {},
              tone,
              llmMessage: llmResult.message,
              signal,
            });
          } else {
            routeResult = await actionRouter.route({
              userInput: transcription,
              intent: offlineParsed.intent,
              entities: offlineParsed.entities,
              tone,
              isOffline: true,
              signal,
            });
          }
        } catch (error) {
          if (signal.aborted) throw error;
          routeResult = await actionRouter.route({
            userInput: transcription,
            intent: offlineParsed.intent,
            entities: offlineParsed.entities,
            tone,
            isOffline: true,
            signal,
          });
        }
      }

      this.throwIfAborted(signal);
      // 3. TTS: Speak out empathetic response
      if (ttsEnabled && routeResult.responseText) {
        onSpeechStateChange?.('speaking');
        try {
          await ttsService.speak(routeResult.responseText);
        } finally {
          onSpeechStateChange?.('idle');
        }
      }

      this.throwIfAborted(signal);
      return { transcription, ...routeResult };
    } finally {
      if (this.activeController === controller) this.activeController = null;
    }
  }

  async speak(text: string): Promise<void> {
    await ttsService.speak(text);
  }

  async stopSpeaking(): Promise<void> {
    await ttsService.stop();
  }

  async pauseSpeaking(): Promise<void> {
    await ttsService.pause();
  }

  async resumeSpeaking(): Promise<void> {
    await ttsService.resume();
  }

  private throwIfAborted(signal: AbortSignal): void {
    if (!signal.aborted) return;
    const error = new Error('Yêu cầu đã bị hủy.');
    error.name = 'AbortError';
    throw error;
  }
}

export const voicePipeline = new VoicePipeline();
