Started at:  2026/11/23 23:32:30
Finished at: 2026/11/23 23:39:15
Total time: 7 minutes
---

# Improvement Walkthrough: system-audit

## Execution Summary

- **Scope:** [2026-11-23-scope.md](docs/improvements/system-audit/2026-11-23-scope.md)
- **Analysis:** [2026-11-23-analysis.md](docs/improvements/system-audit/2026-11-23-analysis.md)
- **Items approved:** 5
- **Items implemented:** 5
- **Items skipped:** 0

---

## Implementation Log

### Item 1: Bổ sung bóc tách mẫu câu thời gian "giờ kém" tiếng Việt

- **Category:** Edge Cases / NLU
- **Location:** `src/core/utils/vietnamese_time_parser.ts`, `src/features/ai/nlu/rule_based_parser.ts`
- **Status:** Completed
- **Files modified:**
  - `src/core/utils/vietnamese_time_parser.ts`: Thêm `kemRegex` xử lý các mẫu câu dạng *"7 giờ kém 15"*, *"8h kém 20 tối"*, *"1 giờ kém 10 chiều"*, *"12 giờ kém 15 đêm"*, kết hợp với AM/PM period modifiers.
  - `src/features/ai/nlu/rule_based_parser.ts`: Cập nhật hàm `extractContent` để bóc tách và loại bỏ cụm "giờ kém" khỏi tiêu đề công việc/lời nhắc.
- **Maps to success criterion:** Criterion #4 (Xử lý toàn diện các trường hợp biên tiếng Việt).
- **Verification:** 10/10 test cases về Time Parser (bao gồm 4 test cases cho giờ kém) chạy thành công 100%.

### Item 2: Xây dựng Test Suite Tự động cho NLU & Phân tích Thời gian Tiếng Việt

- **Category:** Test Coverage
- **Location:** `scripts/check-nlu-parser.cjs`, `package.json`
- **Status:** Completed
- **Files modified:**
  - `scripts/check-nlu-parser.cjs`: Xây dựng script kiểm thử tự động độc lập chạy trực tiếp trên Node.js/TypeScript không cần giả lập thiết bị, bao gồm 29 ca kiểm thử: Standard time, Giờ kém, Relative durations, Repeat days presets & individual days, Set alarm, Cancel alarm, Set reminder, Add/Complete/Edit todo, Query schedule, General QA, Compound commands, Edge cases.
  - `package.json`: Cấu hình các script `npm test`, `npm run test:nlu`, `npm run test:alarm`.
- **Maps to success criterion:** Criterion #4 (Bộ kiểm thử tự động NLU & Time Parser đạt 100% PASS).
- **Verification:** `npm test` kích hoạt cả 2 bộ test runner: 29/29 NLU test cases PASS + 9/9 Background alarm test cases PASS = **38/38 test cases PASS**.

### Item 3: Đồng bộ Đặc tả & Tài liệu Kỹ thuật với Hiện thực Thực tế

- **Category:** Spec Consistency & Documentation
- **Location:** `docs/plans/voice-assistant/2026-09-10-spec.md`, `README.md`
- **Status:** Completed
- **Files modified:**
  - `docs/plans/voice-assistant/2026-09-10-spec.md`: Cập nhật mục 3.1 & 3.2 để ghi nhận việc chuyển đổi sang **Groq Whisper API (`whisper-large-v3`)** qua `expo-audio` + `expo-file-system`, giải thích Architectural Decision Record (ADR) về độ chính xác 99% và độ trễ 150ms; cập nhật sơ đồ điều phối Hybrid Fast-Path (<20ms) và Smart-Path (Groq LLaMA 3.3/3.1 Tool Calling).
  - `README.md`: Cập nhật badge Expo SDK 58, bổ sung hướng dẫn chạy bộ kiểm thử tự động 38 test cases qua `npm test`.
- **Maps to success criterion:** Criterion #1 (Ma trận đối chiếu Đặc tả - Hiện thực đạt 100%).

### Item 4: Tối ưu Truy vấn Tìm kiếm Công việc (`TodoDao.findByTitleLike`)

- **Category:** Performance / Data Layer
- **Location:** `src/data/daos/todo_dao.ts`, `src/domain/services/todo_service.ts`
- **Status:** Completed
- **Files modified:**
  - `src/data/daos/todo_dao.ts`: Bổ sung phương thức `findByTitleLike(titlePattern)` sử dụng truy vấn SQL `SELECT * FROM todos WHERE title LIKE ?` có tham số hóa.
  - `src/domain/services/todo_service.ts`: Cập nhật `findByTitle` để ưu tiên truy vấn thông qua SQL LIKE trước khi chuẩn hóa trong bộ nhớ, tối ưu hiệu năng truy vấn cục bộ.
- **Maps to success criterion:** Criterion #3 (Chất lượng code & an toàn truy vấn).

### Item 5: Chuẩn hóa Structured Debug Logging trong Voice Pipeline

- **Category:** Observability
- **Location:** `src/features/voice/voice_pipeline.ts`
- **Status:** Completed
- **Files modified:**
  - `src/features/voice/voice_pipeline.ts`: Bổ sung tiền tố log chuẩn `[VoicePipeline]` cho cả luồng Fast-Path, Smart-Path và Fallback NLU khi offline hoặc gặp sự cố mạng.
- **Maps to success criterion:** Criterion #3 (Khả năng quan sát & debug).

---

## Deviations from Backlog

Implementation followed the approved backlog exactly.
- Đối với God Component `AlarmListScreen.tsx` (1443 dòng): Được giữ nguyên vẹn ở lần cải tiến này để đảm bảo độ ổn định tuyệt đối của UI, toàn bộ các luồng chức năng và kiểm thử không bị xáo trộn.

## Known Limitations

- Chưa tích hợp dịch vụ thời tiết trực tiếp bên thứ 3 (OpenWeather), hiện sử dụng mô phỏng thời tiết thông minh theo khung giờ/mùa của `morning_briefing_service.ts`.
