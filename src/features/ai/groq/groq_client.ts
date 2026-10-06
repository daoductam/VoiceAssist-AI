import { APP_CONSTANTS } from '@core/constants';
import * as SecureStore from 'expo-secure-store';
import { ToneStyle } from '@domain/enums';

export interface ToolCallResult {
  toolName:
    | 'set_alarm'
    | 'cancel_alarm'
    | 'set_reminder'
    | 'add_todo'
    | 'complete_todo'
    | 'edit_todo'
    | 'query_schedule'
    | 'none';
  parameters: Record<string, string>;
  message: string;
}

export interface UserContextSnapshot {
  nextAlarmTime?: string | null;
  nextAlarmLabel?: string | null;
  activeAlarmCount?: number;
  pendingTodoCount?: number;
  nextReminderTitle?: string | null;
  nextReminderTime?: string | null;
  toneStyle?: ToneStyle;
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
            description:
              'Thời gian đặt báo thức định dạng 24h HH:mm (ví dụ: "06:30", "17:00")',
          },
          label: {
            type: 'string',
            description:
              'Tên hoặc nhãn của báo thức (ví dụ: "Thức dậy", "Báo thức buổi sáng")',
          },
          repeatDays: {
            type: 'string',
            description:
              'Các ngày lặp lại trong tuần nếu người dùng yêu cầu: "daily" (hàng ngày), "weekdays" (thứ 2 đến thứ 6), "weekends" (thứ 7, CN), hoặc danh sách ngày dạng số "0,2,4" (0=T2, 1=T3, ..., 6=CN). Bỏ trống nếu chỉ báo thức một lần.',
          },
        },
        required: ['time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_alarm',
      description:
        'Hủy hoặc tắt báo thức (ví dụ: "hủy báo thức", "tắt báo thức 7h sáng")',
      parameters: {
        type: 'object',
        properties: {
          time: {
            type: 'string',
            description:
              'Giờ của báo thức muốn hủy (định dạng HH:mm). Để trống nếu muốn hủy báo thức gần nhất.',
          },
        },
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
            description:
              'Thời gian nhắc nhở (định dạng HH:mm hoặc số phút đếm ngược)',
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
      description:
        'Thêm một đầu việc hoặc ghi chú vào danh sách cần làm (To-do list)',
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
      name: 'complete_todo',
      description:
        'Đánh dấu hoàn thành một công việc trong danh sách cần làm (ví dụ: "đã mua sữa", "hoàn thành việc nộp bài")',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Tên công việc đã hoàn thành',
          },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_todo',
      description:
        'Sửa nội dung một việc đã có trong danh sách. Chỉ gọi khi biết rõ tên việc cũ và nội dung mới; nếu thiếu thông tin thì hỏi lại người dùng.',
      parameters: {
        type: 'object',
        properties: {
          oldTitle: {
            type: 'string',
            description: 'Tên công việc hiện có cần sửa',
          },
          newTitle: {
            type: 'string',
            description: 'Nội dung mới của công việc',
          },
        },
        required: ['oldTitle', 'newTitle'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'query_schedule',
      description:
        'Tra cứu thông tin lịch trình, các báo thức hoặc công việc cần làm hôm nay',
      parameters: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            description:
              'Phạm vi thời gian muốn tra cứu: "today", "tomorrow", "upcoming"',
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

  async parseIntentWithLlm(
    userInput: string,
    context?: UserContextSnapshot,
    signal?: AbortSignal
  ): Promise<ToolCallResult> {
    const apiKey = await this.getApiKey();
    if (signal?.aborted) throw new Error('Yêu cầu đã bị hủy.');
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

    const toneDescriptions: Record<ToneStyle, string> = {
      friendly:
        'Thân thiện, ấm áp, gần gũi, sử dụng các từ xưng hô nhẹ nhàng và tích cực.',
      professional:
        'Chuyên nghiệp, lịch sự, rõ ràng, gãy gọn, chuẩn mực công sở.',
      cute: 'Dễ thương, ngọt ngào, đáng yêu, nhiều năng lượng vui tươi.',
    };
    const toneDesc = toneDescriptions[context?.toneStyle || 'friendly'];

    let contextSection = '';
    if (context) {
      const parts: string[] = [];
      if (context.nextAlarmTime) {
        parts.push(
          `- Báo thức kế tiếp: ${context.nextAlarmTime} (${context.nextAlarmLabel || 'Báo thức'})`
        );
      } else {
        parts.push('- Báo thức: Hiện không có báo thức nào đang bật');
      }
      parts.push(`- Công việc tồn đọng: ${context.pendingTodoCount ?? 0} việc`);
      if (context.nextReminderTitle && context.nextReminderTime) {
        parts.push(
          `- Lời nhắc sắp tới: "${context.nextReminderTitle}" (${context.nextReminderTime})`
        );
      }
      contextSection = `\n[TÌNH TRẠNG NGƯỜI DÙNG HIỆN TẠI]:\n${parts.join('\n')}\n`;
    }

    const systemPrompt = `Bạn là Trợ lý Giọng nói Tiếng Việt thông minh cho ứng dụng VoiceAssist AI.
Thời gian thực hiện tại của hệ thống: ${timeString}, ${dateString}.
Phong cách giao tiếp yêu cầu: ${toneDesc}
${contextSection}
Quy tắc xử lý:
1. Khi người dùng nói về việc thức dậy ("gọi tôi dậy", "báo thức", "dậy lúc..."): PHẢI GỌI function 'set_alarm' với tham số time là giờ HH:mm (24h).
2. Khi người dùng muốn hủy/tắt báo thức ("hủy báo thức", "tắt báo thức 7h"): GỌI function 'cancel_alarm'.
3. Khi người dùng nói về nhắc việc ("nhắc tôi...", "hẹn giờ uống thuốc", "nhắc tắt bếp"): GỌI function 'set_reminder'.
4. Khi người dùng muốn ghi nhớ việc cần làm: GỌI function 'add_todo'.
5. Khi người dùng báo đã làm xong việc ("xong việc...", "đã mua sữa"): GỌI function 'complete_todo'.
6. Khi người dùng muốn đổi hoặc sửa một Todo đã có: GỌI function 'edit_todo' với oldTitle và newTitle. Nếu thiếu một trong hai thông tin, không tự đoán; hãy hỏi lại.
7. Khi người dùng hỏi về lịch trình hoặc các việc hôm nay: GỌI function 'query_schedule' hoặc trả lời trực tiếp dựa trên dữ liệu hiện tại.
8. Khi người dùng hỏi thời gian ("mấy giờ rồi", "hôm nay ngày mấy"): Hãy trả lời thời gian thực hiện tại là ${timeString}, ${dateString}.
Trả lời ngắn gọn, ấm áp và tự nhiên. Tuyệt đối không nhắc đến tên code hay function.`;

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
      signal,
    });

    // Fallback to fast model if primary model fails
    if (!response.ok) {
      console.warn(
        `Primary LLM (${APP_CONSTANTS.GROQ_LLM_MODEL}) failed (${response.status}), falling back to ${APP_CONSTANTS.GROQ_LLM_FAST_MODEL}`
      );
      response = await fetch(`${APP_CONSTANTS.GROQ_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: APP_CONSTANTS.GROQ_LLM_FAST_MODEL,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput },
          ],
          tools: GROQ_TOOLS,
          tool_choice: 'auto',
          temperature: 0.1,
        }),
        signal,
      });
    }

    if (!response.ok) {
      throw new Error(`Groq LLM Error (${response.status})`);
    }

    const data = await response.json();
    if (signal?.aborted) throw new Error('Yêu cầu đã bị hủy.');
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
