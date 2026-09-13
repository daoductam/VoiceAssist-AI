# Kiểm chứng báo thức nền Android

Ngày: 2026-09-13. Thiết bị ADB: Android 11 (API 30), arm64-v8a, có Google TTS.

## Baseline
Trên APK cũ: nhấn Hẹn chuông 3s rồi Home. Activity đang hiển thị là launcher, không có AlarmPlaybackService. Code cũ chỉ gửi notification/full-screen intent, chưa có service phát TTS hay bridge đưa trạng thái vào modal.

## Kiểm tra tự động
- `npm run typecheck`: đạt sau khi nối bridge/modal.
- `npm run check:background-alarm`: 8/8 đạt. Chạy code TypeScript thật trong VM với adapter nền tảng giả lập; không thay thế kiểm thử Android.

| Case | Ưu tiên | Kết quả |
|---|---|---|
| Thử 3s → một native alarm, có spokenText, không có Expo burst | P0 | PASS |
| Native thất bại → reject, không báo thành công giả | P0 | PASS |
| Thiếu quyền → không xóa lịch trước đó | P0 | PASS |
| Lặp T2, vibrate=false, đồng bộ không xóa snooze | P1 | PASS |
| CN là index 6; giờ tương lai hôm nay giữ đúng ngày | P1 | PASS |
| Countdown 0/NaN, ngày lặp không hợp lệ | P1 | PASS |
| Hủy một báo thức không hủy thông báo thử không liên quan | P1 | PASS |
| iOS vẫn dùng Expo notifications | P1 | PASS (adapter giả lập) |

## Build và tái tạo native
Prebuild chạy hai lần: source Kotlin, receiver/service, TTS query, package registration và lifecycle hooks được tạo đầy đủ. Không đăng ký trùng. Native receiver/service không exported.

Gradle 9.3.1 của template lỗi biên dịch settings plugin của React Native 0.86.3 (AGP 8.12, Kotlin 2.1.20). Plugin ghim wrapper từ 9.3.1 xuống 8.14.3. Không giữ sửa đổi trong node_modules. Bản build đặt EXPO_NO_DOTENV=1 để không đóng gói khóa trong .env.

Artifact Maven React Native release tải trực tiếp từ Maven Central do Gradle tải bị treo; SHA1 khớp a70bffb72c32a275561117caac90ea7ee2b041c9. Sau đó build dùng cache offline.

## Smoke test thiết bị
Đang chờ APK: foreground, Home, khóa màn hình, dừng, hoãn và khởi động khi service đang chạy. Kết quả sẽ cập nhật sau thực nghiệm.

## Giới hạn
Máy đang kết nối không phải Android 14+, nên luồng cấp quyền full-screen/exact alarm trên phiên bản mới cần kiểm tra riêng. Không cam kết hoạt động sau force-stop/reboot. Android có thể chỉ hiện heads-up khi máy mở khóa. Thiếu giọng Việt offline sẽ dùng nhạc chuông; không tự tải giọng hoặc đổi cài đặt của người dùng.
