# AGENTS.md

## Project Overview
**Hệ thống số hóa đơn hàng (Sale Order Digitization) bằng OCR** là giải pháp tự động hóa quy trình xử lý đơn đặt hàng (Sale Order) từ chứng từ ảnh chụp/scan/PDF. Hệ thống tự động nhận dạng chữ (OCR), chuẩn hóa dữ liệu theo rule nghiệp vụ, đối chiếu fuzzy matching với danh mục chủ (khách hàng, sản phẩm), tính điểm tin cậy (confidence score) để auto-approve hoặc chuyển admin duyệt tay trước khi tạo đơn hàng chính thức. Ngoài ra hệ thống còn tích hợp thông báo real-time qua Firebase (FCM) và cung cấp trang Dashboard báo cáo thống kê.

## Tech Stack & Tools
- **Documentation**: Markdown, Mermaid.js, PlantUML (mô hình hóa quy trình nghiệp vụ, sơ đồ luồng, kiến trúc hệ thống).
- **Backend Service**: Java Spring Boot (REST API, business logic, phân quyền Google OAuth2, rule engine, validation).
- **OCR Microservice**: Python (VietOCR), REST API riêng phục vụ nhận dạng văn bản tiếng Việt từ chứng từ.
- **Async Processing & Message Queue**: Apache Kafka (xử lý bất đồng bộ job OCR, retry mechanism, dead-letter queue).
- **Cache & Performance**: Redis (cache kết quả OCR, dữ liệu tổng hợp dashboard).
- **Database**: Relational Database (lưu trữ thông tin đơn hàng, master data khách hàng/sản phẩm, audit log).
- **Authentication & Notification**: Google OAuth2, Firebase Cloud Messaging (FCM).

## Project Structure
### Workspace Directories
- `sprint-docs/`: Tài liệu đặc tả và kế hoạch thực thi chi tiết theo từng Sprint (ví dụ: `sprint-1-sale-order-ocr-v2.md`).
- `.agents/`: Cấu hình AI Agent (workflows, rules, tuyển tập skills hỗ trợ phát triển dự án).
- `README.md`: Tài liệu đặc tả tổng quan hệ thống, luồng nghiệp vụ, yêu cầu chức năng & phi chức năng.
- `AGENTS.md`: Hướng dẫn tổng quan và ngữ cảnh dự án dành cho AI Agents.

## Operational Resources (AI Context)
Mọi hành động của AI phải soi chiếu qua các tài nguyên này:
- **Workflows**: Tham khảo các quy trình chạy tại `.agents/workflows/` (ví dụ: `/debug`, `/design`, `/improve`, `/init`, `/feature`, `/node-installer`, `/optimize-bundle`).
- **Coding Rules**: Tham khảo `.agents/rules/` để đảm bảo chất lượng code và an toàn thông tin (ví dụ: `code-quality.md`, `security.md`).
- **Special Skills**: Các kỹ năng bổ trợ đã được định nghĩa tại `.agents/skills/` (ví dụ: `api-design`, `database-design`, `sequence-diagram`, `entity-reader`, `code-reviewer`, `debug-fe`, v.v.).

## Conventions
- **Language**: Mã nguồn (code/comments) sử dụng Tiếng Anh. Tài liệu đặc tả/hướng dẫn viết bằng Tiếng Việt, giữ nguyên các thuật ngữ chuyên ngành Tiếng Anh để đảm bảo tính chính xác và dễ tra cứu.
- **Visuals**: Sử dụng Mermaid diagrams hoặc PlantUML cho tất cả các phần mô tả luồng (flowchart, sequence, state) và sơ đồ hạ tầng.
- **Commit Message**: Tuân thủ Conventional Commits khi cập nhật tài liệu hoặc chỉnh sửa mã nguồn (`feat: ...`, `fix: ...`, `docs: ...`, `refactor: ...`, `chore: ...`).
