import { NextRequest, NextResponse } from 'next/server';
import { userConfigDb, initDatabase } from '@/lib/db';

// Initialize database
try {
  initDatabase();
} catch (e) {
  // Already initialized
}

// GET - Get current notification settings
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const userConfig = userConfigDb.findBySession(userSession);
    
    if (!userConfig) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy cấu hình người dùng' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        notification_email: userConfig.notification_email || null
      }
    });

  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}

// POST - Update notification email
export async function POST(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email } = body;

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email không hợp lệ' },
        { status: 400 }
      );
    }

    userConfigDb.updateNotificationEmail(userSession, email || null);

    return NextResponse.json({
      success: true,
      message: email ? 'Đã cập nhật email thông báo' : 'Đã tắt thông báo email'
    });

  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}
