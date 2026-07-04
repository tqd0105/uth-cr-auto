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

  async sendDailyScheduleNotification(
    email: string,
    schedule: Array<{
      tenMonHoc: string;
      tuGio: string;
      denGio: string;
      tenPhong: string;
      giangVien: string | null;
      maLopHocPhan: string;
      coSoToDisplay?: string;
    }>,
    date: string,
    customTitle?: string
  ): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    const formattedDate = new Date(date).toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const scheduleRows = schedule.map(item => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; font-weight: 500; color: #1f2937;">${item.tenMonHoc}</td>
        <td style="padding: 12px; color: #2563eb; font-weight: 600;">${item.tuGio} - ${item.denGio}</td>
        <td style="padding: 12px; color: #059669;">${item.tenPhong || 'TBA'}</td>
        <td style="padding: 12px; color: #6b7280;">${item.giangVien || 'TBA'}</td>
      </tr>
    `).join('');

    return this.sendEmail({
      to: email,
      subject: customTitle || `📅 Lịch học ngày ${formattedDate}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f9fafb;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <img src="${appUrl}/uth.png" alt="UTH" style="height: 50px; margin-bottom: 10px;" />
            <h1 style="color: white; margin: 0; font-size: 24px;">📅 Lịch học hôm nay</h1>
            <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 14px;">${formattedDate}</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            ${schedule.length === 0 ? `
              <div style="text-align: center; padding: 40px 0;">
                <p style="color: #10b981; font-size: 48px; margin: 0;">🎉</p>
                <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 10px 0;">Hôm nay không có lịch học!</p>
                <p style="color: #6b7280; font-size: 14px;">Chúc bạn một ngày tốt lành!</p>
              </div>
            ` : `
              <p style="color: #4b5563; margin: 0 0 20px 0;">Bạn có <strong style="color: #3b82f6;">${schedule.length} buổi học</strong> hôm nay:</p>
              <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                <thead>
                  <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Môn học</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Thời gian</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Phòng</th>
                    <th style="padding: 12px; text-align: left; font-weight: 600; color: #374151;">Giảng viên</th>
                  </tr>
                </thead>
                <tbody>
                  ${scheduleRows}
                </tbody>
              </table>
            `}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <a href="${appUrl}/schedule" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Xem chi tiết lịch học</a>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              Email được gửi tự động từ hệ thống UTH Course Registration.<br/>
              <a href="${appUrl}/schedule" style="color: #6b7280;">Quản lý cài đặt thông báo</a>
            </p>
          </div>
        </div>
      `,
    });
  }

  async sendWeeklyScheduleNotification(
    email: string,
    scheduleByDay: Record<number, Array<{
      tenMonHoc: string;
      tuGio: string;
      denGio: string;
      tenPhong: string;
      giangVien: string | null;
      maLopHocPhan: string;
    }>>,
    weekRange: string,
    customTitle?: string
  ): Promise<boolean> {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    const dayNames = ['', 'Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayColors = ['', '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#f97316'];

    let scheduleContent = '';
    const orderedDays = [2, 3, 4, 5, 6, 7, 1]; // Mon to Sun

    for (const day of orderedDays) {
      const daySchedule = scheduleByDay[day];
      if (!daySchedule || daySchedule.length === 0) continue;

      scheduleContent += `
        <div style="margin-bottom: 20px; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <div style="background: ${dayColors[day]}; color: white; padding: 10px 15px; font-weight: 600;">
            ${dayNames[day]} (${daySchedule.length} buổi)
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            ${daySchedule.map(item => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 10px 15px; width: 50%;">${item.tenMonHoc}</td>
                <td style="padding: 10px 15px; color: #2563eb;">${item.tuGio} - ${item.denGio}</td>
                <td style="padding: 10px 15px; color: #059669;">${item.tenPhong || 'TBA'}</td>
              </tr>
            `).join('')}
          </table>
        </div>
      `;
    }

    const totalClasses = Object.values(scheduleByDay).flat().length;
    const daysWithClasses = Object.keys(scheduleByDay).filter(d => scheduleByDay[Number(d)]?.length > 0).length;

    return this.sendEmail({
      to: email,
      subject: customTitle || `📆 Lịch học tuần ${weekRange}`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 0 auto; background: #f9fafb;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
            <img src="${appUrl}/uth.png" alt="UTH" style="height: 50px; margin-bottom: 10px;" />
            <h1 style="color: white; margin: 0; font-size: 24px;">📆 Lịch học tuần này</h1>
            <p style="color: #ddd6fe; margin: 10px 0 0 0; font-size: 14px;">${weekRange}</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <div style="display: flex; gap: 20px; margin-bottom: 25px; justify-content: center;">
              <div style="background: #f0f9ff; padding: 15px 25px; border-radius: 8px; text-align: center;">
                <p style="color: #3b82f6; font-size: 28px; font-weight: 700; margin: 0;">${totalClasses}</p>
                <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">Buổi học</p>
              </div>
              <div style="background: #f0fdf4; padding: 15px 25px; border-radius: 8px; text-align: center;">
                <p style="color: #10b981; font-size: 28px; font-weight: 700; margin: 0;">${daysWithClasses}</p>
                <p style="color: #6b7280; font-size: 12px; margin: 5px 0 0 0;">Ngày có lịch</p>
              </div>
            </div>
            
            ${totalClasses === 0 ? `
              <div style="text-align: center; padding: 40px 0;">
                <p style="color: #10b981; font-size: 48px; margin: 0;">🎉</p>
                <p style="color: #1f2937; font-size: 18px; font-weight: 600; margin: 10px 0;">Tuần này không có lịch học!</p>
              </div>
            ` : scheduleContent}
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
              <a href="${appUrl}/schedule" style="display: inline-block; background: #8b5cf6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;">Xem chi tiết lịch học</a>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
              Email được gửi tự động từ hệ thống UTH Course Registration.<br/>
              <a href="${appUrl}/schedule" style="color: #6b7280;">Quản lý cài đặt thông báo</a>
            </p>
          </div>
        </div>
      `,
    });
  }
}

export const emailService = new EmailService();
