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
      description:
        'Đặt chuông báo thức hoặc hẹn giờ đánh thức dậy (ví dụ: "gọi tôi dậy lúc 6h30", "đặt báo thức 7 giờ", "hẹn 17h dậy")',
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description: 'Thời gian đặt báo thức định dạng 24h HH:mm (ví dụ: "06:30", "17:00")',
          },
          label: {
            type: 'string',
            description: 'Tên hoặc nhãn của báo thức (ví dụ: "Thức dậy", "Báo thức buổi sáng")',
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
      description:
        'Tạo lời nhắc nhở thực hiện công việc, uống thuốc, tắt bếp, họp hành (ví dụ: "nhắc tôi uống nước sau 20 phút", "nhắc họp lúc 14h")',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Nội dung việc cần nhắc nhở',
          },
          time: {
            type: 'string',
            description: 'Thời gian nhắc nhở (định dạng HH:mm hoặc số phút đếm ngược)',
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

    const now = new Date();
    const timeString = now.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
    const dateString = now.toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const systemPrompt = `Bạn là Trợ lý Giọng nói Tiếng Việt thông minh cho ứng dụng VoiceAssist AI.
Thời gian thực hiện tại của hệ thống: ${timeString}, ${dateString}.

Quy tắc xử lý:
1. Khi người dùng nói về việc thức dậy ("gọi tôi dậy", "báo thức", "dậy lúc..."): PHẢI GỌI function 'set_alarm' với tham số time là giờ HH:mm (24h).
2. Khi người dùng nói về nhắc việc ("nhắc tôi...", "hẹn giờ uống thuốc", "nhắc tắt bếp"): GỌI function 'set_reminder'.
3. Khi người dùng muốn ghi nhớ việc cần làm: GỌI function 'add_todo'.
4. Khi người dùng hỏi thời gian ("mấy giờ rồi", "hôm nay ngày mấy"): Hãy trả lời thời gian thực hiện tại là ${timeString}, ${dateString}.
Trả lời ngắn gọn, ấm áp và tự nhiên.`;

    let response = await fetch(`${APP_CONSTANTS.GROQ_API_URL}/chat/completions`, {
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

    // Fallback to secondary model if primary fails
    if (!response.ok) {
      console.warn('Primary LLM failed, trying secondary model qwen/qwen3.8-27b');
      response = await fetch(`${APP_CONSTANTS.GROQ_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput },
          ],
          tools: GROQ_TOOLS,
          tool_choice: 'auto',
          temperature: 0.1,
        }),
      });
    }

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
