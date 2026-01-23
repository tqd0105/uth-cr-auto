import { NextRequest, NextResponse } from 'next/server';
import { RecaptchaService } from '@/lib/services/recaptcha';
import { getUTHApi } from '@/lib/services/uth-api';
import { userConfigDb } from '@/lib/db-postgres';
import { generateUserSession, getRequiredEnv, getOptionalEnv } from '@/lib/utils';
import { sql } from '@vercel/postgres';

interface LoginRequestBody {
  username: string;
  password: string;
  recaptchaToken: string;
}

// Ghi lịch sử đăng nhập
async function logLoginHistory(
  studentId: string,
  studentName: string | null,
  ipAddress: string,
  userAgent: string,
  success: boolean,
  errorMessage?: string
) {
  try {
    await sql`
      INSERT INTO login_history (student_id, student_name, ip_address, user_agent, success, error_message)
      VALUES (${studentId}, ${studentName}, ${ipAddress}, ${userAgent}, ${success}, ${errorMessage || null})
    `;
  } catch (e) {
    console.error('Failed to log login history:', e);
  }
}

// Kiểm tra whitelist
async function checkWhitelist(studentId: string): Promise<boolean> {
  try {
    // Kiểm tra xem bảng có dữ liệu không
    const countResult = await sql`SELECT COUNT(*) as count FROM allowed_users WHERE is_active = true`;
    const totalActive = parseInt(countResult.rows[0]?.count || '0');
    
    // Nếu whitelist trống, cho phép tất cả
    if (totalActive === 0) {
      return true;
    }

    // Kiểm tra MSSV có trong whitelist không
    const result = await sql`
      SELECT * FROM allowed_users 
      WHERE student_id = ${studentId} AND is_active = true
    `;
    return result.rows.length > 0;
  } catch (e) {
    console.error('Failed to check whitelist:', e);
    // Nếu lỗi, cho phép (tránh block tất cả)
    return true;
  }
}

export async function POST(request: NextRequest) {
  // Lấy IP và User Agent để log
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';

  try {
    const body: LoginRequestBody = await request.json();
    const { username, password, recaptchaToken } = body;

    // Validate input
    if (!username || !password || !recaptchaToken) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin đăng nhập' },
        { status: 400 }
      );
    }

    // Kiểm tra whitelist TRƯỚC khi đăng nhập UTH
    const isAllowed = await checkWhitelist(username);
    if (!isAllowed) {
      // Log failed attempt
      await logLoginHistory(username, null, ipAddress, userAgent, false, 'Không có quyền truy cập');
      return NextResponse.json(
        { success: false, message: 'Tài khoản chưa được cấp quyền sử dụng hệ thống. Vui lòng liên hệ admin.' },
        { status: 403 }
      );
    }

    // Verify reCAPTCHA (chỉ verify nếu có secret key)
    const recaptchaSecret = getOptionalEnv('RECAPTCHA_SECRET_KEY');
    const recaptchaSiteKey = getOptionalEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
    
    if (recaptchaSecret && recaptchaSiteKey) {
      const recaptchaService = new RecaptchaService(recaptchaSiteKey, recaptchaSecret);
      const recaptchaResult = await recaptchaService.verify(recaptchaToken);

      if (!recaptchaResult.success) {
        return NextResponse.json(
          { success: false, message: 'Xác thực reCAPTCHA thất bại' },
          { status: 400 }
        );
      }
    }

    // Login to UTH Portal
    const uthApi = getUTHApi();
    const loginResult = await uthApi.login({
      username,
      password,
      'g-recaptcha-response': recaptchaToken
    });

    if (!loginResult.response.success) {
      // Log failed login
      await logLoginHistory(username, null, ipAddress, userAgent, false, loginResult.response.message || 'Sai thông tin đăng nhập');
      return NextResponse.json(
        { success: false, message: loginResult.response.message || 'Đăng nhập thất bại' },
        { status: 401 }
      );
    }

    // Lấy thông tin sinh viên để log
    let studentName = null;
    try {
      const studentInfo = await uthApi.getStudentInfo();
      studentName = studentInfo ? `${studentInfo.hoDem} ${studentInfo.ten}`.trim() : null;
    } catch (e) {
      // Ignore, just for logging
    }

    // Log successful login
    await logLoginHistory(username, studentName, ipAddress, userAgent, true);

    // Use username as session key (so data persists across logins)
    // This way, when user logs in again, their schedules and settings are preserved
    const userSession = `uth_${username}`;

    // Save/update user config to database (including token)
    try {
      await userConfigDb.insert({
        user_session: userSession,
        uth_cookies: JSON.stringify({
          ...loginResult.cookies,
          authToken: loginResult.token // Save token alongside cookies
        })
      });
    } catch (error) {
      console.error('Failed to save user config:', error);
      // Continue even if database save fails
    }

    // Set session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        userSession,
        studentType: loginResult.response.body
      }
    });

    // Set HTTP-only cookie for session
    response.cookies.set('user-session', userSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Lỗi server không xác định' },
      { status: 500 }
    );
  }
}

// Logout endpoint
export async function DELETE(request: NextRequest) {
  try {
    // Only clear session cookie, DON'T delete user data
    // This preserves schedules, notification settings, and logs
    // When user logs in again with same account, they'll have their data back
    
    const response = NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công'
    });

    response.cookies.delete('user-session');

    return response;

  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json(
      { success: false, message: 'Lỗi khi đăng xuất' },
      { status: 500 }
    );
  }
}