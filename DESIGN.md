# DESIGN.md — VoiceAssist AI Design System & Guidelines

> **Project**: VoiceAssist AI (Trợ lý Báo thức & Lời nhắc Thông minh Tiếng Việt)  
> **Design Theme**: **Midnight Synapse** (OLED Dark Mode & Radiant Neural Glow)  
> **Platform**: React Native (Expo) + TypeScript  
> **Stitch Project ID**: `14297283016742618159`

---

## 1. Triết lý Thiết kế (Design Philosophy)

1. **OLED Native & Eye Comfort**: Nền tối sâu (`#0A0C16`), bảo vệ mắt vào ban đêm khi đặt báo thức và tiết kiệm pin màn hình OLED.
2. **Ambient Empathy (Ấm áp & Thấu hiểu)**: Không tạo cảm giác robot cơ học giật mình. Mọi cảnh báo, âm thanh và lời chào đều có sắc thái dịu mắt, chuyển động mềm mại (spring animations).
3. **Voice-First Tactile Feedback**: Quả cầu giọng nói (**Voice Orb**) là trung tâm điều khiển trực quan, biến đổi hình dạng và màu sắc tức thời theo 4 trạng thái hội thoại.
4. **Scannability (Dễ quét thông tin)**: Phân cấp rõ ràng giữa thông tin quan trọng nhất (giờ báo thức tiếp theo, đếm ngược) và danh sách chi tiết.

---

## 2. Bảng mã màu chuẩn (Design Tokens — Color Palette)

```typescript
// src/core/theme/colors.ts
export const Colors = {
  // Nền & Bề mặt (Background & Surfaces)
  background: '#0A0C16',       // Obsidian Đen sâu chuẩn OLED
  surface: '#121526',          // Frosted Slate (card cơ bản)
  surfaceElevated: '#1A1E36',  // Elevated Card / Modal
  surfaceSubtle: '#0F1222',    // Nền phụ, input field
  border: '#252B4D',          // Đường viền ngăn cách card
  borderGlow: 'rgba(99, 102, 241, 0.3)', // Viền phát sáng nhẹ

  // Điểm nhấn chính (Accents & Gradients)
  primary: '#6366F1',          // Electric Indigo (Nút bấm, action chính)
  primaryGlow: 'rgba(99, 102, 241, 0.4)',
  secondary: '#38BDF8',        // Radiant Cyan (Trợ lý, trạng thái nghe)
  secondaryGlow: 'rgba(56, 189, 248, 0.35)',
  ambientPurple: '#A855F7',    // Neon Purple (Chuyển tiếp gradient)
  
  // Trạng thái (Semantic Colors)
  success: '#10B981',          // Emerald Green (Auto-approved, Hoàn thành)
  warning: '#F59E0B',          // Amber Warm (Snooze, Cần xác nhận)
  danger: '#F43F5E',           // Rose Flame (Tắt báo thức khẩn, Xóa)
  info: '#60A5FA',             // Sky Blue (Gợi ý, thời tiết)

  // Văn bản (Typography Colors)
  textPrimary: '#F8FAFC',      // Trắng tuyết tinh khiết (Đọc chính)
  textSecondary: '#94A3B8',    // Muted Lavender (Mô tả, nhãn phụ)
  textMuted: '#64748B',        // Xám lạnh (Icon thụ động, placeholder)
  textAccent: '#818CF8',       // Tím sáng dùng cho link/highlight

  // Gradient Presets
  gradients: {
    orbIdle: ['#6366F1', '#A855F7'],
    orbListening: ['#38BDF8', '#6366F1'],
    orbSpeaking: ['#A855F7', '#EC4899'],
    cardHero: ['#1E1B4B', '#121526'],
    wakeUpAlarm: ['#311042', '#0A0C16'],
  }
};
```

---

## 3. Quy chuẩn Typography & Spacing

### Typography Scale
- **Display 1 (Đồng hồ báo thức to)**: 56px | Bold | Tabular Figures (đếm giây không bị nhảy số)
- **Display 2 (Giờ đếm ngược / Hero Time)**: 40px | Bold | Letter-spacing: -1px
- **Title 1 (Tiêu đề màn hình)**: 24px | Semi-Bold | Color: `textPrimary`
- **Title 2 (Tiêu đề Card)**: 18px | Semi-Bold | Color: `textPrimary`
- **Body Large (Nội dung phản hồi AI)**: 16px | Regular | Line-height: 24px
- **Body Medium (Văn bản thường, Item list)**: 14px | Regular | Line-height: 20px
- **Caption / Badge (Thẻ trạng thái, Ngày lặp)**: 12px | Medium | Letter-spacing: 0.5px
- **Micro (Thời gian phụ, time ago)**: 10px | Regular

### Spacing & Radii
- **Base Grid**: 4px / 8px / 12px / 16px / 24px / 32px
- **Border Radius**:
  - Small (Pill, Tag): `8px`
  - Medium (Input, List Item): `14px`
  - Large (Card, Hero Card): `20px`
  - Extra Large (Modal, Bottom Sheet): `28px`
  - Round (Avatar, Voice Orb): `9999px`

---

## 4. Đặc tả Thành phần Lõi (Core Components)

### 4.1. Voice Orb (Quả Cầu Giọng Nói Tương Tác)
Quả cầu đại diện cho "linh hồn" của VoiceAssist AI, nằm ở trung tâm màn hình Home hoặc góc cố định khi mở hội thoại.

| Trạng thái | Hiệu ứng thị giác & Gradient | Ý nghĩa |
| :--- | :--- | :--- |
| **Idle** | Gradient Indigo-Purple, thở nhẹ (scale 0.96 - 1.04, 3s loop) | Sẵn sàng chạm để nói |
| **Listening** | Radiant Cyan sáng rực, vòng ripple sóng âm tỏa ra theo biên độ mic | Đang lắng nghe người dùng |
| **Thinking** | Xoay chậm 360°, hào quang nhấp nháy tím - xanh | Groq LLM đang xử lý ý định |
| **Speaking** | Neon Purple - Pink sóng dập dờn theo âm lượng TTS | AI đang trả lời bằng giọng nói |

### 4.2. Next Alarm / Countdown Card (Hero Card)
- Nền: Gradient Frosted Indigo to Dark Slate (`#1E1B4B` -> `#121526`) kèm border viền sáng `borderGlow`.
- Hiển thị lớn: "Báo thức kế tiếp lúc 06:30 sáng mai".
- Đồng hồ đếm ngược: "còn 7 giờ 45 phút".
- Tóm tắt AI: "Thời tiết sáng mai 26°C, không mưa. Lịch có họp lúc 09:00".

### 4.3. List Item Cards (Báo thức, Nhắc nhở, To-Do)
- Kích thước chạm tối thiểu: Chiều cao `72px`, padding ngang `16px`.
- Nút Toggle Switch: Tùy biến phát sáng (Active: Electric Indigo `#6366F1`, Inactive: `#252B4D`).
- Dải ngày lặp (Day Pills): `T2 T3 T4 T5 T6 T7 CN` — pill sáng màu xanh cyan khi được chọn.

### 4.4. Tone Selector (3 Phong Cách Giọng Trợ Lý)
- **Thân thiện (Friendly)**: Icon Smile, màu Neon Green, lời chào ấm cúng gần gũi.
- **Chuyên nghiệp (Professional)**: Icon Briefcase, màu Cyan Blue, câu từ gãy gọn, tập trung tiến độ.
- **Dễ thương (Cute)**: Icon Sparkle, màu Pink Glow, xưng hô vui vẻ, động viên ngọt ngào.

---

## 5. Danh sách Màn hình Chi tiết (Screen Specifications)

### Màn hình 1: Home Screen (`HomeScreen.tsx`)
- **Header**: Avatar / Tone badge ("Dễ thương 💖"), Lời chào thông minh ("Chào buổi tối, Tâm!").
- **Center**: Quả cầu **Voice Orb** cỡ lớn (đường kính 140px) có nhịp thở phát sáng. Phía dưới có gợi ý lệnh nói: *"Nhấn để nói: 'Gọi tôi dậy lúc 6h30 nhé'..."*
- **Hero Countdown Card**: Báo thức kế tiếp gần nhất.
- **Quick Agenda**: 3 việc cần làm hôm nay / lời nhắc sắp tới.
- **Bottom Bar**: 3 tab (`Trang chủ`, `Báo thức & Lời nhắc`, `Cài đặt`).

### Màn hình 2: Báo thức & Lời nhắc (`AlarmsRemindersScreen.tsx`)
- **Header Segmented Control**: 3 Tab trượt mượt mà (`Báo thức`, `Lời nhắc`, `To-do`).
- **Nút FAB Tạo nhanh**: Nút tròn nổi bật góc dưới để tạo thủ công nếu không dùng giọng nói.
- **Danh sách item**: Hỗ trợ vuốt trái để xóa, bấm vào để chỉnh sửa giờ, ngày lặp lại, âm thanh.

### Màn hình 3: Màn hình Chuông Báo Thức Reo (`AlarmRingingScreen.tsx`)
- **Giao diện Toàn màn hình (Immersive Fullscreen)**: Nền gradient tím - đen huyền ảo.
- **Đồng hồ số cỡ đại**: Hiển thị giờ hiện tại to rõ nét.
- **Hộp thoại giọng nói nhân ái**: Văn bản thông điệp tích cực chào buổi sáng (kèm giọng TTS tự động đọc êm dịu).
- **Điều khiển bằng giọng nói**: Lắng nghe câu lệnh *"Tôi đã dậy"* hoặc *"Dậy rồi"* để tự tắt chuông.
- **Nút bấm vật lý**: Nút "Báo lại 5 phút" (Amber) và thanh trượt "Vuốt để tắt" (Rose Flame).

### Màn hình 4: Cài đặt & Tinh chỉnh Giọng nói (`SettingsScreen.tsx`)
- **Groq API Key Section**: Input mã hóa hiển thị `••••••••`, có nút "Kiểm tra kết nối" (Ping test độ trễ).
- **Chọn Tone Giọng**: 3 Card minh họa kèm nút nghe thử giọng mẫu.
- **Bộ điều chỉnh giọng đọc (TTS Controls)**: Thanh trượt Tốc độ đọc (Pitch/Rate).
- **Dữ liệu & Đồng bộ**: Nút sao lưu dữ liệu vào SQLite nội bộ và xem dung lượng lưu trữ.

---

## 6. Quy tắc Xây dựng Code Giao diện (Frontend Coding Guidelines)

1. **Không dùng màu Hex tùy tiện**: Mọi màu sắc bắt buộc phải import từ `Colors` trong `@core/theme/colors`.
2. **Hỗ trợ Safe Area**: Mọi màn hình phải bọc trong `SafeAreaView` từ `react-native-safe-area-context` để không bị đè tai thỏ/Dynamic Island.
3. **Hiệu ứng Micro-animations**:
   - Dùng `react-native-reanimated` cho Voice Orb và chuyển động mượt 60fps.
   - Khi bấm các nút tương tác, thêm hiệu ứng nhấn nhẹ (`activeOpacity={0.7}` hoặc Scale 0.97).
4. **Không để Placeholder xơ sài**: Icon sử dụng từ bộ `lucide-react-native`.

---
*Tài liệu này là chuẩn mực giao diện cao nhất cho VoiceAssist AI. Bất kỳ component nào được viết ra đều phải đối chiếu với các thông số trên.*
