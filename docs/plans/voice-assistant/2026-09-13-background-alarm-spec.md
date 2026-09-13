# Báo thức Android khi chạy nền

Người dùng đã duyệt hướng native ngày 2026-09-13.

Tái sử dụng AlarmManager và màn hình AlarmRingingModal. Khi tới giờ, receiver khởi động foreground service mediaPlayback, phát giọng Việt bằng Android TTS và rung; thiếu TTS thì phát nhạc chuông hệ thống. Full-screen notification mở app khi hệ điều hành cho phép. React Native nhận trạng thái báo thức khi đang mở và khi khởi động lại. Chỉ một bên sở hữu âm thanh để tránh đọc trùng.

Kiểm tra quyền exact alarm, notifications và full-screen trước khi thử chuông. Không báo thành công nếu native không khả dụng hoặc thiếu quyền. Có hướng dẫn mở đúng trang cài đặt. Nút tắt dừng service; hoãn 10 phút dùng lại native scheduler. Khi chuyển sang đọc bản tin buổi sáng phải dừng âm thanh báo thức.

Mã native được lưu trong Expo config plugin, sống qua prebuild. Không cam kết tự bung màn hình khi máy đang mở khóa, không vượt force-stop của Android. Phạm vi không bao gồm báo thức sau reboot hay thay đổi iOS.

Kiểm chứng: TypeScript, build APK, kiểm tra trên máy Android qua ADB nếu khả dụng, các trạng thái foreground/background/khóa máy và tắt/hoãn. Các giới hạn chưa kiểm chứng được ghi rõ.
