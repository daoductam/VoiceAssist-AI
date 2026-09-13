# Hướng Dẫn Chạy & Cài Đặt Ứng Dụng VoiceAssist AI Lên Android

Tài liệu này hướng dẫn chi tiết, đầy đủ từng bước cách chạy, build và cài đặt ứng dụng **VoiceAssist AI** lên thiết bị Android thật (qua cáp USB) một cách nhanh chóng và ổn định nhất.

---

## 1. Chuẩn Bị Thiết Bị Android & Máy Tính

### Trên điện thoại Android:
1. Vào **Cài đặt (Settings)** > **Giới thiệu điện thoại (About phone)**.
2. Chạm liên tục 7 lần vào **Số bản dựng (Build number)** hoặc **Phiên bản MIUI/HyperOS** cho đến khi hiện thông báo: *"Bạn đã là nhà phát triển"*.
3. Vào **Cài đặt bổ sung (Additional settings)** > **Tùy chọn nhà phát triển (Developer options)**:
   - Bật **Gỡ lỗi USB (USB Debugging)**.
   - *(Nếu dùng máy Xiaomi / Redmi / Poco)*: Bật thêm **Cài đặt qua USB (Install via USB)** và **Gỡ lỗi USB (Cài đặt bảo mật)**.
4. Cắm cáp USB kết nối điện thoại với laptop > Chọn chế độ **Truyền tệp (File Transfer)**.
5. Khi điện thoại hiện hộp thoại *"Cho phép gỡ lỗi USB từ máy tính này?"* -> Tích chọn **Luôn cho phép** và nhấn **OK**.

### Đường dẫn ADB trên máy tính của bạn:
Công cụ ADB nằm tại:
```
C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe
```

Kiểm tra kết nối thiết bị:
```bash
& "C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices
```
*Kết quả thấy danh sách thiết bị có chữ `device` (ví dụ: `3c97392d device`) là đã kết nối thành công.*

---

## 2. Quy Trình Build APK & Cài Đặt (Khuyên Dùng Nhất - 100% Ổn Định)

Vì ứng dụng có các thành phần Native sâu (BroadcastReceiver, Full-Screen Intent, Media Playback Service, Audio Stream ALARM), cách tốt nhất và ổn định nhất là build qua **EAS Cloud** rồi dùng ADB đẩy thẳng vào điện thoại.

### Bước 2.1: Prebuild Native Code (Nếu có thay đổi plugin/manifest)
```bash
npx expo prebuild --platform android --no-install
```

### Bước 2.2: Kích hoạt Build APK Standalone
```bash
npx -y eas-cli build -p android --profile preview --non-interactive
```
- EAS Cloud sẽ tự động nén mã nguồn (đã cấu hình qua `.easignore` để loại bỏ rác cache và giữ lại thư mục native `android/`).
- Quá trình build trên Cloud mất khoảng 4-6 phút.

### Bước 2.3: Lấy Link Download APK Khi Build Xong
Chạy lệnh xem build gần nhất:
```bash
npx -y eas-cli build:list --limit 1
```
Lệnh này sẽ in ra trường `Application Archive URL` (ví dụ: `https://expo.dev/artifacts/eas/...apk`).

### Bước 2.4: Tải & Cài Đặt Trực Tiếp Vào Điện Thoại Bằng 2 Lệnh

1. **Tải file APK về máy:**
```bash
curl.exe -L "<LINK_APK_O_BUOC_2.3>" -o "app-latest.apk"
```

2. **Cài đè trực tiếp lên điện thoại:**
```bash
& "C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r -d "app-latest.apk"
```

3. **Tự động mở app lên màn hình điện thoại:**
```bash
& "C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.voiceassist.ai -c android.intent.category.LAUNCHER 1
```

4. **Xóa file APK tạm sau khi cài xong:**
```bash
del /f /q app-latest.apk
```

---

## 3. Chạy Ở Chế Độ Phát Triển Nhanh (Development Client / Live Reload)

Nếu bạn chỉ sửa giao diện (UI) hoặc sửa logic TypeScript/React mà **không đụng chạm file native trong `android/`**:

1. **Mở cổng reverse ADB:**
```bash
& "C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe" reverse tcp:8081 tcp:8081
```

2. **Khởi động Metro Bundler:**
```bash
npm run start
```

3. Mở app trên điện thoại, lắc nhẹ máy hoặc nhấn phím `R R` để nạp code mới nhất tức thì.

---

## 4. Các Quyền Quan Trọng Cần Cấp Trên Android Để Báo Thức Reo Chuẩn Xác

Khi app đã được cài vào máy, để báo thức tự động đánh thức màn hình và phát giọng nói AI:

1. **Không hạn chế Pin (Unrestricted Battery):**
   - Vào app > Tab **Cài đặt** > Bấm **"Mở cài đặt Pin không hạn chế"** > Chọn **Không hạn chế**.
2. **Hiển thị trên ứng dụng khác (Appear on top):**
   - Vào Cài đặt máy > Ứng dụng > **VoiceAssist AI** > Quyền đặc biệt > **Xuất hiện trên cùng / Hiển thị trên các ứng dụng khác** > Bật **Cho phép**.
3. **Quyền trên các dòng máy Xiaomi / Redmi / Poco / Oppo:**
   - Nhấn giữ icon app trên màn hình chính > **Thông tin ứng dụng (App Info)** > **Quyền khác (Other permissions)**:
     - Bật: **Hiển thị trên Màn hình khóa (Show on Lock screen)**.
     - Bật: **Hiển thị cửa sổ pop-up khi chạy ngầm (Display pop-up windows while running in the background)**.
4. **Báo thức & Lời nhắc (Alarms & Reminders):**
   - Đảm bảo quyền **Alarms & Reminders** trong mục quyền ứng dụng được **Cho phép**.

---

## 5. Lệnh Tắt Nhanh (Cheatsheet Tổng Hợp)

| Mục đích | Lệnh chạy (PowerShell / CMD) |
|---|---|
| Kiểm tra kết nối điện thoại | `& "C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe" devices` |
| Xem danh sách build gần nhất | `npx -y eas-cli build:list --limit 1` |
| Cài file APK vào điện thoại | `& "C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe" install -r -d "ten_file.apk"` |
| Mở app trên điện thoại | `& "C:\Users\tamda\AppData\Local\Android\Sdk\platform-tools\adb.exe" shell monkey -p com.voiceassist.ai -c android.intent.category.LAUNCHER 1` |
| Kiểm tra lỗi TypeScript | `npm run typecheck` |
| Chạy bộ test báo thức ngầm | `npm run check:background-alarm` |
