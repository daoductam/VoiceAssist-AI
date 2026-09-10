import { ToneStyle } from '@domain/enums';
import { sttService } from './stt_service';
import { ttsService } from './tts_service';
import { groqClient } from '@features/ai/groq/groq_client';
import { ruleBasedParser } from '@features/ai/nlu/rule_based_parser';
import { actionRouter, ActionRouteOutput } from './action_router';

export interface VoiceResult extends ActionRouteOutput {
  transcription: string;
}

export class VoicePipeline {
  async startListening(): Promise<void> {
    // Stop any existing TTS speech
    await ttsService.stop();
    await sttService.startRecording();
  }

  async stopListeningAndProcess(
    tone: ToneStyle = 'cute',
    ttsEnabled: boolean = true
  ): Promise<VoiceResult> {
    // 1. STT: Transcribe audio to text via Groq Whisper
    const transcription = await sttService.stopRecordingAndTranscribe();

    if (!transcription || transcription.trim().length === 0) {
      const emptyResponse = 'Tôi chưa nghe rõ bạn nói gì, bạn nói lại giúp tôi nhé!';
      if (ttsEnabled) {
        await ttsService.speak(emptyResponse);
      }
      return {
        transcription: '',
        responseText: emptyResponse,
        actionTaken: false,
        intent: 'unknown',
      };
    }

    // 2. Intent Parsing (Online Groq LLM with Offline Rule Fallback)
    let routeResult: ActionRouteOutput;

    try {
      // Attempt Groq LLM Function Calling first
      const llmResult = await groqClient.parseIntentWithLlm(transcription);

      if (llmResult.toolName === 'set_alarm') {
        routeResult = await actionRouter.route({
          userInput: transcription,
          intent: 'setAlarm',
          entities: llmResult.parameters,
          tone,
        });
      } else if (llmResult.toolName === 'set_reminder') {
        routeResult = await actionRouter.route({
          userInput: transcription,
          intent: 'setReminder',
          entities: llmResult.parameters,
          tone,
        });
      } else if (llmResult.toolName === 'add_todo') {
        routeResult = await actionRouter.route({
          userInput: transcription,
          intent: 'addTodo',
          entities: llmResult.parameters,
          tone,
        });
      } else if (llmResult.toolName === 'query_schedule') {
        routeResult = await actionRouter.route({
          userInput: transcription,
          intent: 'querySchedule',
          entities: llmResult.parameters,
          tone,
        });
      } else if (llmResult.message && llmResult.message.trim().length > 0) {
        routeResult = await actionRouter.route({
          userInput: transcription,
          intent: 'generalQa',
          entities: {},
          tone,
          llmMessage: llmResult.message,
        });
      } else {
        // Fallback to Rule-based parser
        const offlineIntent = ruleBasedParser.parse(transcription);
        routeResult = await actionRouter.route({
          userInput: transcription,
          intent: offlineIntent.intent,
          entities: offlineIntent.entities,
          tone,
          isOffline: true,
        });
      }
    } catch {
      // On network failure or API error, seamlessly use offline rule parser
      const offlineIntent = ruleBasedParser.parse(transcription);
      routeResult = await actionRouter.route({
        userInput: transcription,
        intent: offlineIntent.intent,
        entities: offlineIntent.entities,
        tone,
        isOffline: true,
      });
    }

    // 3. TTS: Speak out empathetic response
    if (ttsEnabled && routeResult.responseText) {
      await ttsService.speak(routeResult.responseText);
    }

    return {
      transcription,
      ...routeResult,
    };
  }

  async speak(text: string): Promise<void> {
    await ttsService.speak(text);
  }

  async stopSpeaking(): Promise<void> {
    await ttsService.stop();
  }
}

export const voicePipeline = new VoicePipeline();
