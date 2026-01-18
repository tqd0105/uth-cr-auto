import { NextRequest, NextResponse } from 'next/server';
import { autoRegistrationScheduler } from '@/lib/services/scheduler';
import { registrationScheduleDb, registrationLogDb } from '@/lib/db';

// Create a new scheduled registration
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
      scheduleTime, 
      maxRetries = 5 
    } = body;

    // Validation
    if (!courseCode || !classId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    const result = await autoRegistrationScheduler.scheduleRegistration({
      userSession,
      courseCode,
      courseName: courseName || '',
      classId: String(classId),
      classCode: classCode || '',
      scheduleTime: scheduleTime ? new Date(scheduleTime) : new Date(),
      maxRetries
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        data: {
          registrationId: result.registrationId
        }
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Create schedule error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}

// Get all schedules for current user AND check/execute pending schedules
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // IMPORTANT: Check and execute any pending schedules that are due
    // This is the polling mechanism that makes auto-registration work
    await autoRegistrationScheduler.checkAndExecutePendingSchedules(userSession);

    const schedules = autoRegistrationScheduler.getUserSchedules(userSession);
    const logs = registrationLogDb.findByUserSession(userSession, 20);

    return NextResponse.json({
      success: true,
      data: {
        schedules,
        logs
      }
    });

  } catch (error) {
    console.error('Get schedules error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}

// Cancel a scheduled registration
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
    const scheduleId = searchParams.get('id');

    if (!scheduleId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID lịch đăng ký' },
        { status: 400 }
      );
    }

    const success = autoRegistrationScheduler.cancelSchedule(parseInt(scheduleId));

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Đã hủy lịch đăng ký'
      });
    } else {
      return NextResponse.json(
        { success: false, message: 'Không thể hủy lịch đăng ký' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Cancel schedule error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}