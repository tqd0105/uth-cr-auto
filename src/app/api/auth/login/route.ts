import { NextRequest, NextResponse } from 'next/server';
import { RecaptchaService } from '@/lib/services/recaptcha';
import { getUTHApi } from '@/lib/services/uth-api';
import { userConfigDb } from '@/lib/db-postgres';
import { generateUserSession, getRequiredEnv, getOptionalEnv } from '@/lib/utils';

interface LoginRequestBody {
  username: string;
  password: string;
  recaptchaToken: string;
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json(
        { success: false, message: loginResult.response.message || 'Đăng nhập thất bại' },
        { status: 401 }
      );
    }

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