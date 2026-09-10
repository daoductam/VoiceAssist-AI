# AGENTS.md

## Project Overview
**VoiceAssist AI** là ứng dụng trợ lý giọng nói thông minh chuyên biệt cho việc quản lý **báo thức, lời nhắc và lịch trình cá nhân bằng Tiếng Việt**. Ứng dụng mang đến trải nghiệm **đánh thức & nhắc nhở nhân ái (Empathetic & Ambient)**: giọng nói tự nhiên, lời chào buổi sáng tràn đầy năng lượng tích cực, cập nhật thời tiết và tóm tắt lịch trình ngay khi bạn thức giấc.

## Tech Stack & Tools
- **Framework**: React Native + Expo (TypeScript strict mode).
- **State Management**: Zustand (Clean stores for alarms, reminders, todos, settings).
- **Database**: `expo-sqlite` (Local-first architecture, DAOs pattern, safe offline storage).
- **Voice & Speech**:
  - **STT (Speech-to-Text)**: Groq Whisper API (`whisper-large-v3`, ~150ms latency) + on-device fallback.
  - **TTS (Text-to-Speech)**: `expo-speech` (offline Vietnamese `vi-VN`).
  - **Audio Recording**: `expo-av`.
- **AI Intent & Function Calling**:
  - **Online LLM**: Groq Cloud API (`llama-3.3-70b-versatile` / `llama-3.1-8b-instant`) với OpenAI Tool/Function Calling chuẩn để trích xuất ý định và thông số.
  - **Offline NLU**: Bộ bóc tách ngữ nghĩa Regex nội bộ Tiếng Việt (`src/features/ai/nlu/rule_based_parser.ts`) và bộ bóc tách thời gian (`src/core/utils/vietnamese_time_parser.ts`).
- **Notifications**: `expo-notifications` (lập lịch chuông báo thức & thông báo nhắc việc).
- **Security**: `expo-secure-store` (mã hóa lưu trữ Groq API key trên thiết bị).
- **Design System & Icons**: **Midnight Synapse** (OLED Dark Mode, xem chi tiết tại `DESIGN.md`), `lucide-react-native`.

## Project Structure
### Workspace Directories
- `src/core/`: Hằng số, utils xử lý thời gian Tiếng Việt, Design tokens (`colors.ts`, `typography.ts`).
- `src/data/`: Cơ sở dữ liệu SQLite (`database.ts`) và các DAOs (`AlarmDao`, `ReminderDao`, `TodoDao`, `ConversationLogDao`).
- `src/domain/`: Entities, Interfaces, Enums và DTOs.
- `src/features/`: Các module chức năng theo kiến trúc Feature-first:
  - `ai/`: Groq client, tool calling, offline rule-based parser, template generator (3 tones: Friendly, Professional, Cute).
  - `alarm/`: Quản lý báo thức, danh sách và màn hình chuông reo nhân ái.
  - `reminder/`: Quản lý lời nhắc đếm ngược / hẹn giờ.
  - `todo/`: Quản lý danh sách công việc.
  - `voice/`: STT, TTS, bộ điều phối Voice Pipeline & Action Router.
  - `home/`: Màn hình chính với Quả cầu tương tác Voice Orb.
  - `settings/`: Cài đặt giọng điệu, tốc độ đọc, Groq API key.
- `src/shared/`: UI Components dùng chung (`VoiceOrb`, `Card`, `BottomNavBar`, ...) và Zustand stores (`useAlarmStore`, `useReminderStore`, `useTodoStore`, `useSettingsStore`).
- `docs/plans/voice-assistant/`: Tài liệu đặc tả (`2026-09-10-spec.md`) và kế hoạch triển khai chi tiết (`2026-09-10-plan.md`).
- `DESIGN.md`: Quy chuẩn thiết kế UI/UX theo Design System Midnight Synapse.
- `README.md`: Hướng dẫn tổng quan dự án, kiến trúc và cách chạy ứng dụng.

## Operational Resources (AI Context)
- **Workflows**: `.agents/workflows/` (debug, feature, improve, v.v.).
- **Coding Rules**: `.agents/rules/` (`code-quality.md`, `security.md`).
- **Design Specs**: Tuân thủ nghiêm ngặt `DESIGN.md` (màu sắc, typography, kích thước chạm, animations).

## Conventions
- **Language**: Mã nguồn (code/comments) sử dụng Tiếng Anh. Tài liệu đặc tả/hướng dẫn viết bằng Tiếng Việt, giữ nguyên các thuật ngữ chuyên ngành Tiếng Anh.
- **Git Commit**: Tuân thủ Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`, `chore:`).
- **Security**: KHÔNG commit file `.env` hoặc API keys lên Git repo.
