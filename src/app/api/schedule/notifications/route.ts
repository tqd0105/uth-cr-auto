import { NextRequest, NextResponse } from 'next/server';
import { scheduleNotificationDb, userConfigDb } from '@/lib/db';

// GET - Get notification settings for current user
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const settings = scheduleNotificationDb.findBySession(userSession);

    return NextResponse.json({
      success: true,
      data: settings || null
    });

  } catch (error) {
    console.error('Get notification settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy cài đặt thông báo' },
      { status: 500 }
    );
  }
}

// POST - Save/Update notification settings
export async function POST(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Check if user exists in user_configs
    const userConfig = userConfigDb.findBySession(userSession);
    if (!userConfig) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email, is_enabled, notification_type, notification_time, custom_title, send_day_before } = body;

    // Validate email if enabled
    if (is_enabled && !email) {
      return NextResponse.json(
        { success: false, message: 'Vui lòng nhập email để nhận thông báo' },
        { status: 400 }
      );
    }

    // Validate notification_type
    if (notification_type && !['daily', 'weekly'].includes(notification_type)) {
      return NextResponse.json(
        { success: false, message: 'Loại thông báo không hợp lệ' },
        { status: 400 }
      );
    }

    // Validate notification_time format (HH:mm)
    if (notification_time && !/^\d{2}:\d{2}$/.test(notification_time)) {
      return NextResponse.json(
        { success: false, message: 'Định dạng thời gian không hợp lệ' },
        { status: 400 }
      );
    }

    scheduleNotificationDb.upsert({
      user_session: userSession,
      email: email || '',
      is_enabled: Boolean(is_enabled),
      notification_type: notification_type || 'daily',
      notification_time: notification_time || '07:00',
      custom_title: custom_title || undefined,
      send_day_before: send_day_before !== false
    });

    return NextResponse.json({
      success: true,
      message: 'Đã lưu cài đặt thông báo'
    });

  } catch (error) {
    console.error('Save notification settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lưu cài đặt thông báo' },
      { status: 500 }
    );
  }
}

// DELETE - Remove notification settings
export async function DELETE(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    scheduleNotificationDb.delete(userSession);

    return NextResponse.json({
      success: true,
      message: 'Đã xóa cài đặt thông báo'
    });

  } catch (error) {
    console.error('Delete notification settings error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa cài đặt thông báo' },
      { status: 500 }
    );
  }
}
