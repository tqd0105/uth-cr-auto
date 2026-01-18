import nodemailer from 'nodemailer';

interface EmailConfig {
  to: string;
  subject: string;
  html: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    // Use Gmail SMTP - user needs to set up App Password
    // Or use other SMTP services
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass, // App Password for Gmail
        },
      });
    }
  }

  async sendEmail(config: EmailConfig): Promise<boolean> {
    if (!this.transporter) {
      console.log('[Email] SMTP not configured, skipping email');
      return false;
    }

    try {
      await this.transporter.sendMail({
        from: process.env.SMTP_USER,
        to: config.to,
        subject: config.subject,
        html: config.html,
      });
      console.log(`[Email] Sent to ${config.to}: ${config.subject}`);
      return true;
    } catch (error) {
      console.error('[Email] Failed to send:', error);
      return false;
    }
  }

  async sendRegistrationSuccess(
    email: string,
    courseName: string,
    classCode: string
  ): Promise<boolean> {
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    return this.sendEmail({
      to: email,
      subject: `✅ Đăng ký thành công: ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🎉 Đăng ký thành công!</h1>
          </div>
          <div style="background: #f0fdf4; padding: 20px; border: 1px solid #bbf7d0; border-radius: 0 0 10px 10px;">
            <h2 style="color: #166534; margin-top: 0;">Thông tin đăng ký</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dcfce7;"><strong>Môn học:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dcfce7;">${courseName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #dcfce7;"><strong>Mã lớp:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #dcfce7;">${classCode}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Thời gian:</strong></td>
                <td style="padding: 10px;">${now}</td>
              </tr>
            </table>
            <p style="color: #166534; margin-top: 20px;">
              Hệ thống đăng ký tự động UTH đã hoàn thành việc đăng ký cho bạn.
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendRegistrationFailed(
    email: string,
    courseName: string,
    classCode: string,
    errorMessage: string,
    retryCount: number,
    maxRetries: number
  ): Promise<boolean> {
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    return this.sendEmail({
      to: email,
      subject: `❌ Đăng ký thất bại: ${courseName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">❌ Đăng ký thất bại</h1>
          </div>
          <div style="background: #fef2f2; padding: 20px; border: 1px solid #fecaca; border-radius: 0 0 10px 10px;">
            <h2 style="color: #991b1b; margin-top: 0;">Thông tin lỗi</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca;"><strong>Môn học:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${courseName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca;"><strong>Mã lớp:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${classCode}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca;"><strong>Lỗi:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca; color: #991b1b;">${errorMessage}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca;"><strong>Số lần thử:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fecaca;">${retryCount}/${maxRetries}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Thời gian:</strong></td>
                <td style="padding: 10px;">${now}</td>
              </tr>
            </table>
            <p style="color: #991b1b; margin-top: 20px;">
              Đăng ký tự động đã thất bại sau ${maxRetries} lần thử. Vui lòng đăng ký thủ công.
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendRetryNotification(
    email: string,
    courseName: string,
    classCode: string,
    retryCount: number,
    maxRetries: number,
    errorMessage: string
  ): Promise<boolean> {
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    
    return this.sendEmail({
      to: email,
      subject: `🔄 Đang thử lại đăng ký: ${courseName} (${retryCount}/${maxRetries})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; text-align: center;">🔄 Đang thử lại...</h1>
          </div>
          <div style="background: #fffbeb; padding: 20px; border: 1px solid #fde68a; border-radius: 0 0 10px 10px;">
            <h2 style="color: #92400e; margin-top: 0;">Thông tin</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;"><strong>Môn học:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;">${courseName}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;"><strong>Mã lớp:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;">${classCode}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;"><strong>Lỗi gặp phải:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;">${errorMessage}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;"><strong>Lần thử:</strong></td>
                <td style="padding: 10px; border-bottom: 1px solid #fde68a;">${retryCount}/${maxRetries}</td>
              </tr>
              <tr>
                <td style="padding: 10px;"><strong>Thời gian:</strong></td>
                <td style="padding: 10px;">${now}</td>
              </tr>
            </table>
            <p style="color: #92400e; margin-top: 20px;">
              Hệ thống sẽ tự động thử lại trong vài giây...
            </p>
          </div>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
