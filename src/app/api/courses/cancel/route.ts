import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUTHApi } from '@/lib/api-helpers';
import { registrationLogDb } from '@/lib/db-postgres';

interface CancelRequestBody {
  idDangKy: number;
  courseName?: string;
  classCode?: string;
  recaptchaToken?: string;
}

export async function DELETE(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const body: CancelRequestBody = await request.json();
    const { idDangKy, courseName = '', classCode = '', recaptchaToken } = body;

    // Validate input
    if (!idDangKy) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID đăng ký' },
        { status: 400 }
      );
    }

    console.log('Cancel request:', { idDangKy, courseName, classCode, hasRecaptcha: !!recaptchaToken });

    const uthApi = await getAuthenticatedUTHApi(userSession);
    
    // Cancel registration
    const success = await uthApi.cancelRegistration(idDangKy, recaptchaToken);

    // Log cancellation attempt
    try {
      await registrationLogDb.insert({
        user_session: userSession,
        action: 'cancel',
        course_name: courseName,
        class_code: classCode,
        status: success ? 'success' : 'failed',
        message: success ? 'Hủy đăng ký thành công' : 'Hủy đăng ký thất bại'
      });
    } catch (logError) {
      console.error('Failed to log cancellation:', logError);
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Hủy đăng ký học phần thành công'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Hủy đăng ký học phần thất bại' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Course cancellation error:', error);
    
    // Log failed cancellation
    const userSession = request.cookies.get('user-session')?.value;
    if (userSession) {
      try {
        const body: CancelRequestBody = await request.json();
        await registrationLogDb.insert({
          user_session: userSession,
          action: 'cancel',
          course_name: body.courseName || '',
          class_code: body.classCode || '',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      } catch (logError) {
        console.error('Failed to log cancellation:', logError);
      }
    }

    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}