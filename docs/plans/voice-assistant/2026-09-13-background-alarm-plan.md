# Implementation Plan: Báo thức nền Android

Spec Source: `2026-09-13-background-alarm-spec.md`
Owner: Codex
Last Updated: 2026-09-13
Status: In Progress

## 1. Context
Chuông thử hiện chỉ hiện notification/rung. Native chưa có TTS service hay đồng bộ trạng thái với React. Ảnh hưởng scheduler, bridge, App và modal; không đổi nghiệp vụ reminders/iOS.

## 2. Constraints
Kotlin + TypeScript strict, Expo, không thêm dependency. Tôn trọng quyền Android và thay đổi sẵn có của người dùng.

## 3. Conventions
Code/comment Tiếng Anh; tài liệu Tiếng Việt. Lỗi permission trả mã rõ; không nuốt lỗi đặt chuông. Native source lưu trong `plugins/android-alarm/`.

## 4. Contracts
- `getCapabilities()` → available/exactAlarm/fullScreen/notifications; chỉ đọc.
- `setExactAlarm(params)` yêu cầu ID và ngày tương lai hợp lệ, permissions đủ; thành công → lịch native, lỗi → reject. Có repeatDays cho lịch tuần.
- `getActiveAlarm()` → payload id/label/time/spokenText/occurrenceId hoặc null. Event chỉ báo thay đổi; đọc lại state khi app active/cold start.
- `stopRinging(id)` → chỉ dừng đúng báo thức hiện hành, idempotent.
- `snooze(id, minutes)` → đặt lại payload hiện hành trước khi dừng âm thanh; lỗi giữ báo thức.
- `nativeAudio` trong store/modal ngăn phát TTS JavaScript trùng.

## 5. Target Architecture
UI → notificationService → bridge → AlarmManager → receiver → service → notification + TTS/ringtone + active state → React → modal. Dừng/hoãn đi ngược bridge tới service. Config plugin đăng ký manifest/package và sao chép Kotlin vào prebuild.

## 6. Artifact Registry
| Artifact | Task | Contract |
|---|---|---|
| plugins/withAndroidAlarm.js, app.json | T1 | Prebuild |
| plugins/android-alarm/AlarmScheduler.kt, AndroidAlarmModule.kt, AndroidAlarmPackage.kt | T2 | Scheduling/bridge |
| plugins/android-alarm/AlarmReceiver.kt, AlarmPlaybackService.kt, AlarmAudioPlayer.kt, AlarmNotification.kt | T3a/T3b | Native delivery/audio |
| src/core/utils/native_alarm_bridge.ts | T4 | TS bridge |
| src/domain/services/notification_service.ts, alarm_service.ts | T5 | Scheduling |
| App.tsx, src/shared/stores/useAlarmStore.ts, src/features/alarm/AlarmRingingModal.tsx | T6 | Presentation/actions |
| docs/plans/voice-assistant/2026-09-13-background-alarm-verification.md | T7 | Evidence |
| scripts/check-background-alarm.cjs, package.json | T7 | Kiểm tra scheduler bằng Node assert, không thêm dependency |

## 7. Task Graph
T1 → T2 → T3a → T3b → T4 → T5 → T6 → T7. Thực hiện tuần tự trong phiên này.

## 8. Task Specifications
- T1: input cấu hình hiện có; output plugin idempotent, đăng ký receiver/service/permissions và package. Prebuild hai lần không trùng declarations.
- T2: input contract payload; output lịch exact + bridge. Thiếu quyền → reject; ID giống nhau → thay lịch; hủy → không reo. Lịch tuần chọn đúng thứ.
- T3a: input receiver intent; output service/state/fullscreen notification, có nút tắt/hoãn. Cold start → lấy được payload.
- T3b: input spokenText; output TTS Việt lặp, rung và chuông dự phòng. Dừng → giải phóng TTS/focus/wakelock/timer.
- T4: input native methods; output wrapper và permission guidance; thiếu module → lỗi rõ trên Android.
- T5: input alarm entity; output một lịch native trên Android, giữ Expo cho nền tảng khác. Chuông thử thành công không còn burst trùng.
- T6: input active state/event; output modal và actions đồng bộ. Khởi động/lấy foreground không đọc trùng, tắt/hoãn không tự mở lại.
- T7: input bản sửa; output typecheck/build, smoke test và review. Báo rõ các case chưa chạy được.

## 9. Edge Cases
| Case | Kỳ vọng | Task |
|---|---|---|
| Không có native module/permission | Lỗi rõ, hướng dẫn quyền | T2/T4 |
| spokenText rỗng/TTS thiếu vi-VN | Văn bản mặc định/chuông dự phòng | T3b |
| Ngày quá khứ/NaN/0 | Reject | T2/T4 |
| Nhãn Tiếng Việt | Đọc/hiển thị nguyên văn | T3/T6 |
| Event và cold start đồng thời | Không phát trùng | T6 |
| Tắt báo thức cũ khi chuông mới reo | Không dừng nhầm ID | T3a |
| Hoãn khi app nền | Native schedule, không phụ thuộc JS timer | T3a/T6 |

## 10. Risks
FSI phụ thuộc Android/OEM; xác minh trên máy. Giọng Việt có thể chưa cài; fallback ringtone. Native source bị ignore; khắc phục bằng plugin. Không đặt mục tiêu hoạt động sau force-stop/reboot.

## 11. Verification Plan
Chưa có framework unit test: dùng Node assert để kiểm tra scheduler với adapter native/Expo giả lập, typecheck, Gradle, kiểm tra config plugin và bảng smoke test trực tiếp. P0: 3s/foreground/background/locked, native service/TTS, dismiss/snooze, permissions denied. P1: cold start, double test, tiếng Việt, ngày không hợp lệ, TTS thiếu. Review chỉ các file sửa và dependencies trực tiếp.

## 12. Rollout
Build APK cài cập nhật giữ dữ liệu, thử trên máy đang kết nối. Không publish.

## 13. Future Improvements
Khôi phục lịch sau reboot là hạng mục riêng.
