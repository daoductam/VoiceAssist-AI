import { APP_CONSTANTS } from '@core/constants';
import * as SecureStore from 'expo-secure-store';

export interface ToolCallResult {
  toolName: 'set_alarm' | 'set_reminder' | 'add_todo' | 'query_schedule' | 'none';
  parameters: Record<string, string>;
  message: string;
}

const GROQ_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'set_alarm',
      description: 'Đặt báo thức đánh thức vào một thời điểm cụ thể trong ngày (giờ và phút)',
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description: 'Thời gian đặt báo thức định dạng 24h HH:mm (ví dụ: "06:30", "07:00")',
          },
          label: {
            type: 'string',
            description: 'Nhãn hoặc tên gọi của báo thức (ví dụ: "Dậy tập thể dục")',
          },
        },
        required: ['time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'set_reminder',
      description: 'Tạo lời nhắc nhở hẹn giờ cho một công việc hoặc sự kiện',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Nội dung cần nhắc (ví dụ: "Uống thuốc", "Tắt bếp", "Họp nhóm")',
          },
          time: {
            type: 'string',
            description: 'Thời gian nhắc nhở (HH:mm hoặc số phút)',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_todo',
      description: 'Thêm một đầu việc hoặc ghi chú vào danh sách cần làm (To-do list)',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Nội dung việc cần làm (ví dụ: "Mua sữa và bánh mì")',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_schedule',
      description: 'Tra cứu thông tin lịch trình, các báo thức hoặc công việc cần làm hôm nay',
      parameters: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            description: 'Phạm vi thời gian muốn tra cứu: "today", "tomorrow", "upcoming"',
          },
        },
      },
    },
  },
];

export class GroqClient {
  private async getApiKey(): Promise<string> {
    try {
      const stored = await SecureStore.getItemAsync(
        APP_CONSTANTS.SECURE_STORE_KEY_GROQ
      );
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    } catch {
      // Fallback
    }
    return process.env.EXPO_PUBLIC_GROQ_API_KEY || '';
  }

  async parseIntentWithLlm(userInput: string): Promise<ToolCallResult> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      return { toolName: 'none', parameters: {}, message: '' };
    }

    const systemPrompt = `Bạn là Trợ lý Giọng nói Tiếng Việt thông minh cho ứng dụng VoiceAssist AI.
Nhiệm vụ của bạn là lắng nghe câu nói của người dùng và gọi function phù hợp (set_alarm, set_reminder, add_todo, query_schedule).
Nếu người dùng nói chuyện phiếm hoặc hỏi thăm thông thường, hãy trả lời tự nhiên, ấm áp bằng tiếng Việt.`;

    const response = await fetch(`${APP_CONSTANTS.GROQ_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: APP_CONSTANTS.GROQ_LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userInput },
        ],
        tools: GROQ_TOOLS,
        tool_choice: 'auto',
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq LLM Error (${response.status})`);
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;

    if (choice?.tool_calls && choice.tool_calls.length > 0) {
      const call = choice.tool_calls[0];
      const fnName = call.function.name as ToolCallResult['toolName'];
      let parsedArgs: Record<string, string> = {};
      try {
        parsedArgs = JSON.parse(call.function.arguments || '{}');
      } catch {
        parsedArgs = {};
      }
      return {
        toolName: fnName,
        parameters: parsedArgs,
        message: choice.content || '',
      };
    }

    return {
      toolName: 'none',
      parameters: {},
      message: choice?.content || '',
    };
  }
}

export const groqClient = new GroqClient();
