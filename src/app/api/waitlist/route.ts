import { NextRequest, NextResponse } from 'next/server';
import { waitlistDb, WaitlistStatus } from '@/lib/db-postgres';

// GET - Get user's waitlist
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const waitlist = await waitlistDb.findByUserSession(userSession);

    return NextResponse.json({
      success: true,
      data: waitlist
    });

  } catch (error) {
    console.error('Get waitlist error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}

// POST - Add to waitlist
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
    const { 
      courseCode, 
      courseName, 
      classId, 
      classCode,
      priority = 1,
      checkInterval = 30 // seconds
    } = body;

    // Validation
    if (!courseCode || !classId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const result = await waitlistDb.insert({
      user_session: userSession,
      course_code: courseCode,
      course_name: courseName || '',
      class_id: String(classId),
      class_code: classCode || '',
      priority,
      status: WaitlistStatus.WAITING,
      check_interval: checkInterval
    });

    return NextResponse.json({
      success: true,
      message: 'Đã thêm vào danh sách chờ',
      data: {
        waitlistId: result.lastInsertRowid
      }
    });

  } catch (error) {
    console.error('Add to waitlist error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}

// DELETE - Remove from waitlist
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
    const waitlistId = searchParams.get('id');

    if (!waitlistId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID' },
        { status: 400 }
      );
    }

    // Verify ownership
    const entry = await waitlistDb.findById(parseInt(waitlistId));
    if (!entry || entry.user_session !== userSession) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy hoặc không có quyền' },
        { status: 404 }
      );
    }

    await waitlistDb.delete(parseInt(waitlistId));

    return NextResponse.json({
      success: true,
      message: 'Đã xóa khỏi danh sách chờ'
    });

  } catch (error) {
    console.error('Remove from waitlist error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}
