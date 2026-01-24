import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { emailService } from '@/lib/services/email';

interface AccessRequestBody {
  studentId: string;
  studentName: string;
  email?: string;
  reason: string;
}

// POST - Gửi yêu cầu cấp quyền
export async function POST(request: NextRequest) {
  try {
    const body: AccessRequestBody = await request.json();
    const { studentId, studentName, email, reason } = body;

    // Validate input
    if (!studentId || !studentName || !reason) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng điền đầy đủ thông tin' },
        { status: 400 }
      );
    }

    // Get client info
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Check if student already has pending request
    const existingRequest = await sql`
      SELECT * FROM access_requests 
      WHERE student_id = ${studentId} AND status = 'pending'
    `;

    if (existingRequest.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Bạn đã có yêu cầu đang chờ xử lý. Vui lòng đợi admin duyệt.' },
        { status: 400 }
      );
    }

    // Check if student is already in whitelist
    const existingWhitelist = await sql`
      SELECT * FROM allowed_users 
      WHERE student_id = ${studentId} AND is_active = true
    `;

    if (existingWhitelist.rows.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Tài khoản của bạn đã được cấp quyền. Vui lòng thử đăng nhập lại.' },
        { status: 400 }
      );
    }

    // Insert new request
    await sql`
      INSERT INTO access_requests (student_id, student_name, email, reason, ip_address, user_agent)
      VALUES (${studentId}, ${studentName}, ${email || null}, ${reason}, ${ipAddress}, ${userAgent})
    `;

    // Send email to admin
    const adminEmail = process.env.ADMIN_EMAIL;
    if (adminEmail) {
      await emailService.sendEmail({
        to: adminEmail,
        subject: `[UTH Auto] Yêu cầu cấp quyền mới - ${studentId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #1e40af;">🔔 Yêu cầu cấp quyền mới</h2>
            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p><strong>MSSV:</strong> ${studentId}</p>
              <p><strong>Họ tên:</strong> ${studentName}</p>
              ${email ? `<p><strong>Email:</strong> ${email}</p>` : ''}
              <p><strong>Lý do:</strong></p>
              <p style="background: white; padding: 10px; border-radius: 4px;">${reason}</p>
              <p style="color: #666; font-size: 12px;">
                <strong>IP:</strong> ${ipAddress}<br>
                <strong>Thời gian:</strong> ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
              </p>
            </div>
            <p style="color: #666;">
              Truy cập <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://uth-cr-auto.vercel.app'}/admin">Admin Panel</a> để xử lý yêu cầu.
            </p>
          </div>
        `
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Yêu cầu đã được gửi. Vui lòng đợi admin xử lý.'
    });

  } catch (error) {
    console.error('Access request error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// GET - Kiểm tra trạng thái yêu cầu của student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu MSSV' },
        { status: 400 }
      );
    }

    // Get latest request
    const result = await sql`
      SELECT status, created_at, reviewed_at, admin_note
      FROM access_requests 
      WHERE student_id = ${studentId}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        hasRequest: false
      });
    }

    return NextResponse.json({
      success: true,
      hasRequest: true,
      request: result.rows[0]
    });

  } catch (error) {
    console.error('Get access request error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
