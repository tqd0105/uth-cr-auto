// Email service for sending notifications
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendIssueReportEmail({
  name,
  email,
  issueType,
  description,
  timestamp,
  userAgent,
}: {
  name: string;
  email: string;
  issueType: string;
  description: string;
  timestamp: string;
  userAgent?: string;
}) {
  const issueTypeLabels: Record<string, string> = {
    bug: '🐛 Lỗi hệ thống',
    feature: '💡 Đề xuất tính năng',
    ui: '🎨 Vấn đề giao diện',
    performance: '⚡ Hiệu năng',
    other: '📝 Khác',
  };

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';

  try {
    const { data, error } = await resend.emails.send({
      from: 'UTH Auto <onboarding@resend.dev>', // Resend default sender
      to: adminEmail,
      replyTo: email,
      subject: `[UTH Auto] ${issueTypeLabels[issueType] || 'Báo cáo mới'} - ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
              .field { margin-bottom: 15px; }
              .label { font-weight: bold; color: #1f2937; }
              .value { margin-top: 5px; padding: 10px; background: white; border-radius: 4px; border: 1px solid #e5e7eb; }
              .footer { margin-top: 20px; padding: 15px; background: #f3f4f6; border-radius: 4px; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2>📧 Báo cáo mới từ UTH Auto</h2>
              </div>
              <div class="content">
                <div class="field">
                  <div class="label">👤 Người gửi:</div>
                  <div class="value">${name}</div>
                </div>
                <div class="field">
                  <div class="label">📧 Email:</div>
                  <div class="value"><a href="mailto:${email}">${email}</a></div>
                </div>
                <div class="field">
                  <div class="label">🏷️ Loại vấn đề:</div>
                  <div class="value">${issueTypeLabels[issueType] || issueType}</div>
                </div>
                <div class="field">
                  <div class="label">📝 Mô tả chi tiết:</div>
                  <div class="value" style="white-space: pre-wrap;">${description}</div>
                </div>
                <div class="field">
                  <div class="label">🕐 Thời gian:</div>
                  <div class="value">${new Date(timestamp).toLocaleString('vi-VN')}</div>
                </div>
                ${userAgent ? `
                <div class="field">
                  <div class="label">💻 Thiết bị:</div>
                  <div class="value" style="font-size: 11px; color: #6b7280;">${userAgent}</div>
                </div>
                ` : ''}
              </div>
              <div class="footer">
                <p>Email này được gửi tự động từ hệ thống UTH Auto Registration.</p>
                <p>Bạn có thể trả lời trực tiếp email này để liên hệ với người gửi báo cáo.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
}
