# Đặc Tả Kỹ Thuật: Hệ Thống Đa Lượt Hội Thoại & Hỏi Bù Thông Tin (Multi-Turn Dialogue & Slot-Filling Engine)

> **Codename**: VoiceAssist AI — Multi-Turn Dialogue
> **Target Module**: `src/features/voice/`, `src/features/ai/`, `src/shared/stores/`
> **Ngày tạo**: 2026-11-23
> **Tác giả**: Nhóm 6 ĐACN
> **Trạng thái**: Approved for Implementation

---

## 1. Tổng Quan & Mục Tiêu (Overview & Objectives)

Hiện tại, hệ thống xử lý giọng nói của VoiceAssist AI hoạt động theo mô hình **đơn lượt (Single-turn / Stateless)**:
- Mỗi câu nói của người dùng được phân tích độc lập.
- Khi người dùng nói một câu lệnh thiếu tham số (ví dụ: *"Đặt báo thức"* nhưng không nói giờ, hoặc *"Nhắc tôi uống thuốc"* nhưng không có thời gian), hệ thống tự động gán giá trị mặc định (`07:00` hoặc `15 phút sau`) thay vì hỏi lại người dùng.
- Khi người dùng trả lời câu hỏi bù (ví dụ: *"6 rưỡi sáng"*), hệ thống không nhớ ngữ cảnh câu trước là đang muốn đặt báo thức.

**Mục tiêu của tính năng này:**
1. **Slot-Filling Thông Minh (Local & Offline)**: Nhận biết tham số bắt buộc còn thiếu của Intent (ví dụ `time` của Báo thức, `time` hoặc `title` của Lời nhắc), tạm dừng thực thi và sinh câu hỏi bù tự nhiên theo đúng Tone giọng điệu đã chọn.
2. **Kế Thừa Ngữ Cảnh Tức Thì (Context Continuity)**: Khi người dùng trả lời ở lượt tiếp theo (chỉ nói giờ hoặc chỉ nói tên việc), hệ thống tự động điền vào slot còn thiếu và hoàn tất tác vụ mà không bắt người dùng phải nói lại từ đầu.
3. **Smart-Path Groq Multi-Turn Memory**: Bơm 6 tin nhắn gần nhất (3 lượt user-assistant) vào Groq Cloud LLaMA 3.3 để duy trì ngữ cảnh trò chuyện tự do liền mạch.
4. **Resilience & Safety**: Hỗ trợ lệnh hủy ngang ("thôi", "hủy", "không cần"), tự động chuyển Intent khi người dùng đổi ý, và tự hết hạn session sau 90 giây không tương tác.

---

## 2. Kiến Trúc & Cấu Trúc Dữ Liệu (Architecture & Data Model)

### 2.1 Entity & Interface Quản Lý Phiên (`useDialogueStore.ts`)

```typescript
export type DialogueSlot = 'time' | 'title' | 'label';

export interface SlotFillingSession {
  sessionId: string;
  intent: 'setAlarm' | 'setReminder' | 'addTodo';
  missingSlot: DialogueSlot;
  collectedEntities: Record<string, string>;
  promptQuestion: string;
  createdAt: number;
  expiresAt: number; // TTL = 90.000 ms (90 giây)
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface DialogueStoreState {
  activeSession: SlotFillingSession | null;
  recentTurns: ChatTurn[];
  startSlotFilling: (session: Omit<SlotFillingSession, 'sessionId' | 'createdAt' | 'expiresAt'>) => void;
  fillSlot: (slot: DialogueSlot, value: string) => Record<string, string> | null;
  cancelSession: () => void;
  clearExpiredSession: () => boolean;
  addChatTurn: (role: 'user' | 'assistant', content: string) => void;
  clearHistory: () => void;
}
```

---

## 3. Luồng Xử Lý & Chuyển Đổi Trạng Thái (Data Flow & State Transitions)

```
                              USER NÓI
                                 │
                                 ▼
                     [useDialogueStore.activeSession?]
                                 │
                 ┌───────────────┴───────────────┐
                YES                              NO
                 │                               │
                 ▼                               ▼
       User nói "Thôi" / "Hủy"?         Phân tích Intent thông thường
       ├── YES ➔ Hủy session & TTS      (RuleBasedParser / GroqClient)
       └── NO  ➔ Đang chờ slot gì?              │
                 │                              ▼
         ┌───────┴───────┐             Kiểm tra Slot bắt buộc:
       'time'         'title'          - setAlarm: cần `time`
         │               │             - setReminder: cần `time` + `title`
         ▼               ▼             - addTodo: cần `title`
   Bóc tách giờ    Trích xuất text              │
   (TimeParser)   (extractContent)              ▼
         │               │             Thiếu Slot bắt buộc?
         └───────┬───────┘             ├── NO  ➔ Thực thi Action ngay
                 ▼                     └── YES ➔ Mở SlotFillingSession
         Đủ tham số chưa?                        & Hỏi bù theo Tone:
         ├── YES ➔ Thực thi Action               "Bạn muốn đặt lúc mấy giờ?"
         └── NO  ➔ Hỏi tiếp slot còn lại
```

### 3.1 Quy Tắc Sinh Câu Hỏi Bù Theo Tone (Prompt Generation)
Khi thiếu slot, `responseGenerator` sinh câu hỏi phù hợp với phong cách đã chọn:

| Tình huống | Tone Friendly | Tone Professional | Tone Cute |
| :--- | :--- | :--- | :--- |
| **Báo thức thiếu giờ** | *"Bạn muốn mình đặt báo thức lúc mấy giờ nè?"* | *"Vui lòng cung cấp thời gian bạn muốn đặt báo thức."* | *"Chủ nhân ơi, mình đặt báo thức lúc mấy giờ đây ạ? ⏰"* |
| **Lời nhắc thiếu giờ** | *"Bạn muốn mình nhắc việc này lúc mấy giờ?"* | *"Xin cho biết thời gian bạn muốn nhận lời nhắc."* | *"Nhắc bạn lúc mấy giờ nè, nói cho mình biết đi~ ✨"* |
| **Lời nhắc thiếu việc** | *"Bạn muốn mình nhắc việc gì lúc {time} nè?"* | *"Vui lòng cho biết nội dung cần nhắc lúc {time}."* | *"Lúc {time} bạn cần mình nhắc việc gì nè chủ nhân? 🌸"* |

### 3.2 Quy Tắc Bóc Tách Ở Lượt Trả Lời Tiếp Theo (Slot Extraction)
1. **Nếu đang chờ slot `'time'`**:
   - Sử dụng `vietnameseTimeParser.parse(userInput)` hoặc `parseTimeOfDay(userInput)`.
   - Nếu câu nói có giờ hợp lệ (ví dụ: *"6 rưỡi sáng"*, *"7 giờ kém 15"*, *"sau 20 phút nữa"*):
     - Ghi nhận `time: '06:30'` vào `collectedEntities`.
     - Chuyển tiếp thực thi Action Router với dữ liệu đã gom đủ.
   - Nếu câu nói không có giờ nhưng là lệnh mới (ví dụ: *"Hôm nay có việc gì làm"*):
     - Tự động hủy session pending cũ và chuyển sang xử lý intent `querySchedule`.
2. **Nếu đang chờ slot `'title'`**:
   - Lấy chuỗi văn bản người dùng nói (loại bỏ các từ đệm: *"là"*, *"về việc"*).
   - Ghi nhận `title: 'nội dung'` vào `collectedEntities`.
   - Chuyển tiếp thực thi Action Router.

### 3.3 Hủy Ngang & Hết Hạn
- **Từ khóa hủy**: `/(?:thôi|hủy|bỏ qua|không cần|thôi không đặt nữa|dừng lại)/i`.
- Khi kích hoạt: Xóa session pending, phản hồi: *"Dạ, đã hủy yêu cầu vừa rồi cho bạn nhé!"*.
- **TTL**: Phiên tự động xóa sau 90 giây không có lượt nói tiếp theo.

---

## 4. Tích Hợp Đa Lượt Với Groq Cloud (Smart-Path Multi-Turn)

Tại [groq_client.ts](file:///d:/vibe-code/alarm-ai-assistance/src/features/ai/groq/groq_client.ts):
- Khi gọi `chat.completions.create`, mảng `messages` được cấu thành từ:
  ```typescript
  const messages = [
    { role: 'system', content: dynamicSystemPromptWithContext },
    ...recentTurns.map(t => ({ role: t.role, content: t.content })),
    { role: 'user', content: userInput },
  ];
  ```
- Sau mỗi phản hồi thành công, cập nhật `recentTurns` (tối đa 6 tin nhắn gần nhất) để lần gọi tiếp theo giữ trọn ngữ cảnh đối thoại.

---

## 5. Chiến Lược Kiểm Thử Tự Động (Acceptance Test Suite)

Tất cả các ca kiểm thử sau sẽ được thêm vào `scripts/check-nlu-parser.cjs`:

| STT | Tên ca kiểm thử | Input Lượt 1 | Kỳ vọng Lượt 1 | Input Lượt 2 | Kỳ vọng Lượt 2 |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **1** | Báo thức thiếu giờ | *"Đặt báo thức"* | Mở session `setAlarm`, missing `time` | *"6 rưỡi sáng"* | Hoàn tất `setAlarm`, time: `06:30`, session = null |
| **2** | Báo thức giờ kém | *"Hẹn giờ dậy"* | Mở session `setAlarm`, missing `time` | *"7 giờ kém 15"* | Hoàn tất `setAlarm`, time: `06:45`, session = null |
| **3** | Lời nhắc thiếu giờ | *"Nhắc tôi uống thuốc"* | Mở session `setReminder`, missing `time`, title=`uống thuốc` | *"sau 15 phút nữa"* | Hoàn tất `setReminder`, có `remindAt`, title=`uống thuốc` |
| **4** | Lời nhắc thiếu việc | *"Nhắc tôi lúc 3h chiều"* | Mở session `setReminder`, missing `title`, time=`15:00` | *"Đi họp với khách"* | Hoàn tất `setReminder`, title=`Đi họp với khách`, time=`15:00` |
| **5** | Hủy ngang session | *"Đặt báo thức"* | Mở session `setAlarm` | *"Thôi không cần nữa"* | Hủy session, session = null, không tạo báo thức |
| **6** | Chuyển ý đột ngột | *"Đặt báo thức"* | Mở session `setAlarm` | *"Thời tiết hôm nay thế nào"* | Hủy session cũ, nhận diện `generalQa` |
| **7** | Timeout hết hạn | *"Đặt báo thức"* | Session có `expiresAt` | Sau 91 giây | `clearExpiredSession()` trả về `true`, session = null |
