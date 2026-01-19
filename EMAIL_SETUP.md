# Hướng dẫn setup Email Report

Khi có người gửi báo cáo, bạn sẽ nhận email tự động tới inbox của mình.

## Bước 1: Tạo tài khoản Resend (Miễn phí)

1. Truy cập: https://resend.com/signup
2. Đăng ký với email của bạn (dtech.webdevteam@gmail.com)
3. Xác nhận email

## Bước 2: Lấy API Key

1. Sau khi đăng nhập, vào: https://resend.com/api-keys
2. Click "Create API Key"
3. Đặt tên: "UTH Auto Reports"
4. Copy API key (dạng: re_...)

## Bước 3: Cấu hình môi trường

### Cho Development (Local)
Mở file `.env.local` và thay:
```env
RESEND_API_KEY="your-resend-api-key-here"
```
Bằng API key vừa copy.

### Cho Production (Vercel)
1. Vào: https://vercel.com/tqd0105s-projects/uth-cr-auto/settings/environment-variables
2. Thêm 2 biến:
   - `RESEND_API_KEY` = API key của bạn
   - `ADMIN_EMAIL` = dtech.webdevteam@gmail.com (email nhận báo cáo)
3. Click Save

## Bước 4: Deploy

```bash
vercel --prod
```

## Test

1. Vào https://uth-cr-auto.vercel.app
2. Cuộn xuống footer
3. Click "Gửi báo cáo"
4. Điền form và gửi
5. Kiểm tra inbox: dtech.webdevteam@gmail.com

## Email mẫu sẽ như thế nào?

```
From: UTH Auto <onboarding@resend.dev>
To: dtech.webdevteam@gmail.com
Reply-To: email-nguoi-gui@example.com
Subject: [UTH Auto] 🐛 Lỗi hệ thống - Nguyễn Văn A

📧 Báo cáo mới từ UTH Auto
👤 Người gửi: Nguyễn Văn A
📧 Email: email@example.com
🏷️ Loại vấn đề: 🐛 Lỗi hệ thống
📝 Mô tả chi tiết: ...
🕐 Thời gian: 19/01/2026, 14:30:00
💻 Thiết bị: Mozilla/5.0...
```

**Bạn có thể reply trực tiếp email để liên hệ với người gửi báo cáo!**

## Free Tier Limits

- 100 emails/ngày
- 3,000 emails/tháng
- Hoàn toàn đủ cho ứng dụng sinh viên

## Lưu ý

- Báo cáo vẫn được lưu vào database dù email fail
- Bạn có thể xem logs tại: https://resend.com/logs
- Email từ `onboarding@resend.dev` (domain mặc định của Resend free tier)
- Muốn custom domain? Nâng cấp lên Pro plan
