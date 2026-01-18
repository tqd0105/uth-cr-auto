import { NextRequest, NextResponse } from 'next/server';
import { RecaptchaService } from '@/lib/services/recaptcha';
import { getAuthenticatedUTHApi } from '@/lib/api-helpers';
import { registrationLogDb } from '@/lib/db';
import { getOptionalEnv } from '@/lib/utils';

interface RegisterRequestBody {
  idLopHocPhan: number;
  recaptchaToken: string;
  courseName?: string;
  classCode?: string;
  isBulk?: boolean; // Skip reCAPTCHA for bulk registration
}

export async function POST(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const body: RegisterRequestBody = await request.json();
    const { idLopHocPhan, recaptchaToken, courseName = '', classCode = '', isBulk = false } = body;

    // Validate input
    if (!idLopHocPhan) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin đăng ký' },
        { status: 400 }
      );
    }

    // Skip reCAPTCHA for bulk registration
    if (!isBulk && !recaptchaToken) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin đăng ký' },
        { status: 400 }
      );
    }

    // Verify reCAPTCHA (skip for bulk registration)
    const recaptchaSecret = getOptionalEnv('RECAPTCHA_SECRET_KEY');
    const recaptchaSiteKey = getOptionalEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY');
    
    if (!isBulk && recaptchaSecret && recaptchaSiteKey) {
      const recaptchaService = new RecaptchaService(recaptchaSiteKey, recaptchaSecret);
      const recaptchaResult = await recaptchaService.verify(recaptchaToken);

      if (!recaptchaResult.success) {
        // Log failed registration
        try {
          registrationLogDb.insert({
            user_session: userSession,
            action: 'register',
            course_name: courseName,
            class_code: classCode,
            status: 'failed',
            message: 'reCAPTCHA verification failed'
          });
        } catch (logError) {
          console.error('Failed to log registration:', logError);
        }

        return NextResponse.json(
          { success: false, message: 'Xác thực reCAPTCHA thất bại' },
          { status: 400 }
        );
      }
    }

    const uthApi = await getAuthenticatedUTHApi(userSession);
    
    // Register for class
    const success = await uthApi.registerForClass({
      idLopHocPhan,
      'g-recaptcha-response': recaptchaToken
    });

    // Log registration attempt
    try {
      registrationLogDb.insert({
        user_session: userSession,
        action: 'register',
        course_name: courseName,
        class_code: classCode,
        status: success ? 'success' : 'failed',
        message: success ? 'Đăng ký thành công' : 'Đăng ký thất bại'
      });
    } catch (logError) {
      console.error('Failed to log registration:', logError);
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Đăng ký học phần thành công'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Đăng ký học phần thất bại' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Course registration error:', error);
    
    // Log failed registration
    const userSession = request.cookies.get('user-session')?.value;
    if (userSession) {
      try {
        const body: RegisterRequestBody = await request.json();
        registrationLogDb.insert({
          user_session: userSession,
          action: 'register',
          course_name: body.courseName || '',
          class_code: body.classCode || '',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (logError) {
        console.error('Failed to log registration:', logError);
      }
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}