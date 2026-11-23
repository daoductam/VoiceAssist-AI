# Implementation Plan: Multi-Turn Dialogue & Slot-Filling Engine

Spec Source: `docs/plans/voice-assistant/2026-11-23-multi-turn-dialogue-spec.md`  
Owner: Nhóm 6 ĐACN  
Last Updated: 2026-11-23  
Status: `Approved`

---

# 1. Context

**Problem:**  
VoiceAssist AI hiện hoạt động theo mô hình đơn lượt (Single-turn / Stateless). Khi người dùng ra lệnh thiếu tham số (ví dụ: *"Đặt báo thức"* hoặc *"Nhắc tôi uống thuốc"*), hệ thống tự gán giờ mặc định thay vì hỏi lại. Khi người dùng trả lời bổ sung ở câu tiếp theo (ví dụ: *"6 rưỡi sáng"*), hệ thống không giữ ngữ cảnh để hoàn tất tác vụ.

**Affected Modules:**  
- `src/shared/stores/useDialogueStore.ts` — Quản lý trạng thái phiên slot-filling và bộ đệm lịch sử chat
- `src/features/ai/response/response_generator.ts` — Sinh câu hỏi bù slot theo 3 Tone
- `src/features/voice/action_router.ts` — Phát hiện thiếu slot bắt buộc và mở session
- `src/features/voice/voice_pipeline.ts` — Điều phối lượt trả lời kế tiếp, bóc tách slot và hoàn tất intent
- `src/features/ai/groq/groq_client.ts` — Bơm lịch sử hội thoại gần nhất vào Groq LLM
- `scripts/check-nlu-parser.cjs` — Kiểm thử tự động kịch bản đa lượt

**Non-Goals:**  
- Không lưu toàn bộ lịch sử trò chuyện hàng tháng vào đám mây (giữ vững Local-First).
- Không xây dựng chatbot tâm sự vô tận vượt quá năng lực trợ lý âm thanh di động.

---

# 2. Constraints

**Language:** TypeScript (Strict mode)  
**Architecture:** Feature-first + Clean Architecture + Zustand Stores  

**Rules:**  
- Không làm ảnh hưởng đến độ trễ Fast-Path (<20ms).
- Khi offline hoặc không có mạng, luồng Local Slot-Filling vẫn phải hoạt động 100%.
- Giữ vững 0 lỗi compile (`npx tsc --noEmit`).

**Performance Budgets:**  
- In-memory Slot Matching: < 5ms.
- Session TTL: 90 giây.
- Recent Chat Memory: Tối đa 6 tin nhắn (3 cặp user/assistant).

---

# 3. Conventions

**Naming:**  
- Stores: `useDialogueStore.ts` (Zustand hook).
- Types: `SlotFillingSession`, `ChatTurn`, `DialogueSlot`.
- Methods: `startSlotFilling()`, `fillSlot()`, `cancelSession()`.

**Error Handling:**  
- Nếu slot không hợp lệ: hỏi lại nhẹ nhàng, không throw unhandled exception.
- Khi người dùng nói "thôi", "hủy": reset session ngay lập tức.
- Tự động dọn dẹp session hết hạn (`clearExpiredSession`).

**Testing:**  
- Chạy trực tiếp qua `npm test` (`scripts/check-nlu-parser.cjs`).
- Naming: `Dialogue: <kịch bản>` (ví dụ: `Dialogue: asks for missing time when setting alarm`).

---

# 4. Contracts

## Interface: `DialogueStoreState`

```typescript
export type DialogueSlot = 'time' | 'title' | 'label';

export interface SlotFillingSession {
  sessionId: string;
  intent: 'setAlarm' | 'setReminder' | 'addTodo';
  missingSlot: DialogueSlot;
  collectedEntities: Record<string, string>;
  promptQuestion: string;
  createdAt: number;
  expiresAt: number; // TTL = 90.000 ms
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
```

- `startSlotFilling(session)`: Khởi tạo phiên chờ slot mới.
- `fillSlot(slot, value)`: Điền giá trị vào slot thiếu, trả về entities đầy đủ nếu hoàn tất.
- `cancelSession()`: Hủy bỏ phiên đang chờ.
- `clearExpiredSession()`: Kiểm tra `Date.now() > expiresAt`, hủy nếu quá hạn.
- `addChatTurn(role, content)`: Thêm tin nhắn vào bộ nhớ đệm (giữ tối đa 6 items).

---

# 5. Target Architecture & Interaction Flow

```
User: "Đặt báo thức"
  │
  ▼
VoicePipeline ──▶ ActionRouter
  │                  │
  │                  ├── Phát hiện thiếu `time`
  │                  ├── Sinh câu hỏi theo Tone: "Bạn muốn đặt lúc mấy giờ nè?"
  │                  └── useDialogueStore.startSlotFilling(setAlarm, missing: 'time')
  ▼
TTS đọc câu hỏi ──▶ User nghe & nói: "6 rưỡi sáng mai"
  │
  ▼
VoicePipeline
  ├── Kiểm tra useDialogueStore.activeSession
  ├── Đang chờ slot 'time' ➔ vietnameseTimeParser.parse("6 rưỡi sáng mai") -> "06:30"
  ├── useDialogueStore.fillSlot('time', '06:30') -> trả về full entities
  ├── Gọi ActionRouter.route(intent: 'setAlarm', time: '06:30')
  └── TTS đọc: "Đã đặt báo thức lúc 06:30 sáng mai cho bạn rồi nhé!"
```

---

# 6. Artifact Registry

| File | Action | Owner Task | Contract / Mục tiêu |
| :--- | :---: | :---: | :--- |
| `src/shared/stores/useDialogueStore.ts` | **Create** | Task 1 | `DialogueStoreState`, quản lý session & history |
| `src/features/ai/response/response_generator.ts` | **Modify** | Task 2 | Sinh câu hỏi bù slot theo Tone |
| `src/features/voice/action_router.ts` | **Modify** | Task 3 | Phát hiện thiếu slot & kích hoạt slot-filling |
| `src/features/voice/voice_pipeline.ts` | **Modify** | Task 4 | Đón lượt nói tiếp theo, điền slot & hủy session |
| `src/features/ai/groq/groq_client.ts` | **Modify** | Task 5 | Bơm `recentTurns` vào `messages` của Groq LLM |
| `scripts/check-nlu-parser.cjs` | **Modify** | Task 6 | 8+ unit test cases cho toàn bộ luồng đa lượt |

---

# 7. Task Graph & Dependencies

```
Task 1 (Store) ──▶ Task 2 (Prompt Generator) ──▶ Task 3 (Action Router)
                                                         │
                                                         ▼
Task 5 (Groq Memory) ◀────────────────────────── Task 4 (Voice Pipeline)
       │                                                 │
       └─────────────────────────┬───────────────────────┘
                                 ▼
                         Task 6 (Test Suite)
```

---

# 8. Task Specifications

### Task 1: Xây dựng `useDialogueStore.ts`
- **Files**: `src/shared/stores/useDialogueStore.ts` (Create)
- **Nhiệm vụ**: Tạo Zustand store quản lý `activeSession` với TTL 90s và `recentTurns` (tối đa 6 tin nhắn).
- **Tiêu chuẩn**: `tsc --noEmit` pass.

### Task 2: Mở rộng `ResponseGenerator` sinh câu hỏi bù tham số
- **Files**: `src/features/ai/response/response_generator.ts` (Modify)
- **Nhiệm vụ**: Thêm phương thức `generateMissingSlotPrompt(intent, missingSlot, tone, context)` sinh câu hỏi bù tự nhiên theo 3 Tone.

### Task 3: Cập nhật `ActionRouter` nhận diện thiếu slot
- **Files**: `src/features/voice/action_router.ts` (Modify)
- **Nhiệm vụ**: Thay vì gán giờ default `07:00` hay `15 phút sau`, phát hiện thiếu slot bắt buộc và gọi `useDialogueStore.getState().startSlotFilling(...)`.
- **Output**: Trả về `isAwaitingFollowUp: true`.

### Task 4: Tích hợp đón lượt trả lời bù trong `VoicePipeline`
- **Files**: `src/features/voice/voice_pipeline.ts` (Modify)
- **Nhiệm vụ**:
  - Kiểm tra từ khóa hủy (*"thôi"*, *"hủy"*).
  - Nếu có session đang chờ: bóc tách tham số tương ứng và gọi `fillSlot`.
  - Thực thi tác vụ hoàn tất với dữ liệu đầy đủ.

### Task 5: Bơm lịch sử chat gần nhất vào Groq LLM Client
- **Files**: `src/features/ai/groq/groq_client.ts` (Modify)
- **Nhiệm vụ**: Lấy `useDialogueStore.getState().recentTurns` đưa vào mảng `messages` khi gọi Groq API.

### Task 6: Bổ sung bộ kiểm thử tự động đa lượt vào Test Suite
- **Files**: `scripts/check-nlu-parser.cjs` (Modify)
- **Nhiệm vụ**: Viết 8 ca kiểm thử tự động cho luồng đa lượt và xác nhận `npm test` 100% PASS.

---

# 9. Edge Cases & Handling

| Tình huống biên | Cách xử lý | Task xử lý |
| :--- | :--- | :---: |
| Người dùng đổi ý nói lệnh mới hoàn toàn | Hủy session cũ, thực thi intent mới | Task 4 |
| Người dùng nói từ khóa hủy ("thôi", "hủy") | Xóa session, AI đáp "Đã hủy yêu cầu" | Task 4 |
| Câu trả lời không chứa giờ hợp lệ | Nhẹ nhàng nhắc lại: "Bạn cho mình xin giờ cụ thể nhé" | Task 4 |
| Quá hạn 90 giây | `clearExpiredSession()` tự động xóa session | Task 1 & 4 |

---

# 10. Verification Checklist

- [ ] `useDialogueStore` khởi tạo và quản lý session đúng TTL.
- [ ] Nói *"Đặt báo thức"* ➔ AI hỏi lại giờ thay vì tự đặt 7h.
- [ ] Nói *"6 rưỡi sáng"* ➔ Tạo báo thức 06:30 thành công.
- [ ] Nói *"Nhắc tôi uống thuốc"* ➔ AI hỏi lại giờ.
- [ ] Nói *"Thôi"* ➔ Hủy thành công.
- [ ] Chạy `npm test` đạt 100% PASS (tổng cộng 46+ test cases).
- [ ] `npx tsc --noEmit` đạt 0 lỗi.
