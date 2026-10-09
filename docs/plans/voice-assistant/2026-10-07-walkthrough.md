# Implementation Walkthrough: Tách trải nghiệm báo thức và lời nhắc

Spec: `docs/plans/voice-assistant/2026-10-07-spec.md`  
Plan: `docs/plans/voice-assistant/2026-10-07-plan.md`  
Date: `2026-10-07`  
Status: `Implemented`

## Execution Summary

- Đã triển khai TASK-001 đến TASK-005 trong phạm vi TypeScript, Expo Notifications và contract native Android.
- Không thay đổi database schema, NLU hoặc voice pipeline.
- Giữ native exact alarm cho development build/APK; thêm Expo Notifications fallback khi chạy Expo Go.

## Implementation Log

### TASK-001: Active alert contracts and store migration

- Tạo `ActiveAlert` union gồm `AlarmAlert` và `ReminderAlert`.
- Tạo `useAlertStore` để quản lý alert đang hiển thị và chống duplicate event.
- Loại bỏ ringing state khỏi `useAlarmStore`; alarm store chỉ còn alarm data/CRUD.

### TASK-002: Type-specific scheduling and configurable snooze

- Alarm snooze dùng `alarm.snoozeDuration`, mặc định 5 phút.
- Reminder snooze dùng 10 phút và schedule notification tạm thời riêng.
- Reminder bỏ burst notification thứ hai sau 8 giây.
- Native Android bridge/scheduler nhận duration từ JavaScript; native action label đổi thành 5 phút.
- Khi không có custom native module, Android Expo Go dùng Expo Notifications fallback.

### TASK-003: Alarm-only root flow

- `AlarmRingingModal` chỉ còn alarm wake-up flow và morning briefing.
- App route native/notification alarm payload vào `useAlertStore.openAlarm`.
- Dismiss one-time alarm có fallback đọc trực tiếp từ `AlarmService` nếu store chưa load khi cold-start.

### TASK-004: Reminder action sheet

- Tạo `ReminderActionSheet` dạng bottom sheet nhẹ.
- Reminder có hai action: hoàn thành và nhắc lại sau 10 phút.
- Reminder không mở alarm modal, không rung/TTS lặp và không vào morning briefing.
- Direct test reminder trong `AlarmListScreen` đã chuyển sang alert store mới.

### TASK-005: Verification

- `npm.cmd run typecheck` — passed.
- `node scripts/check-background-alarm.cjs` — passed, gồm case Expo Go fallback.
- Stale reference scan cho `ringingAlarm`, `openRingingAlarm`, `closeRingingAlarm`, `isReminder` — không còn.
- `git diff --check` — không có whitespace error.

## Deviations from Plan

| Planned Approach | Actual Approach | Reason |
|---|---|---|
| Native Android compile trong verification | Không dùng làm gate trong phiên này | Người dùng đang chạy Expo Go; custom native module không được Expo Go nạp |
| Native Android chỉ là path chính | Giữ path native và bổ sung Expo Go fallback | Cho phép người dùng test alarm/reminder flow trực tiếp bằng Expo Go |
| Reminder action sheet có thể đọc TTS một lần | Chưa thêm TTS tự động trong sheet | Giảm noise; notification đã có sound và action rõ ràng |

## Known Limitations

- Expo Go không thể kiểm chứng exact alarm, full-screen native alarm hoặc Android foreground playback service; cần development build/APK cho các case đó.
- `Reminder.repeatInterval` chưa được triển khai thêm semantics/UI cho recurring reminder, đúng phạm vi đã thống nhất.
- Chưa có Playwright hoặc unit test runner trong repository; verification hiện dựa trên typecheck, Node scheduler check và smoke test thủ công.
