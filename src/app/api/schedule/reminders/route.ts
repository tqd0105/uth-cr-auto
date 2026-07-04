import { NextRequest, NextResponse } from 'next/server';
import { classReminderDb, userConfigDb } from '@/lib/db';

// GET - Get all reminders for current user
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const reminders = classReminderDb.findBySession(userSession);

    return NextResponse.json({
      success: true,
      data: reminders
    });

  } catch (error) {
    console.error('Get reminders error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy danh sách nhắc nhở' },
      { status: 500 }
    );
  }
}

// POST - Create new reminder
export async function POST(request: NextRequest) {
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
        { success: false, message: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { email, class_id, class_name, class_date, class_time, room, remind_before, note } = body;

    // Validate required fields
    if (!email || !class_id || !class_name || !class_date || !class_time) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Check if reminder already exists
    const existing = classReminderDb.findByClassAndDate(userSession, class_id, class_date);
    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Đã có nhắc nhở cho buổi học này' },
        { status: 400 }
      );
    }

    classReminderDb.insert({
      user_session: userSession,
      email,
      class_id,
      class_name,
      class_date,
      class_time,
      room: room || '',
      remind_before: remind_before || 30,
      note
    });

    return NextResponse.json({
      success: true,
      message: 'Đã tạo nhắc nhở thành công'
    });

  } catch (error) {
    console.error('Create reminder error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi tạo nhắc nhở' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a reminder
export async function DELETE(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID nhắc nhở' },
        { status: 400 }
      );
    }

    classReminderDb.delete(Number(id));

    return NextResponse.json({
      success: true,
      message: 'Đã xóa nhắc nhở'
    });

  } catch (error) {
    console.error('Delete reminder error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi xóa nhắc nhở' },
      { status: 500 }
    );
  }
}
