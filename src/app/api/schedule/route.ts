import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUTHApi } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Get date from query params or use current date
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const uthApi = await getAuthenticatedUTHApi(userSession);
    const schedule = await uthApi.getLichHoc(date);

    // Group schedule by day of week
    const groupedSchedule = schedule.reduce((acc, item) => {
      const day = item.thu;
      if (!acc[day]) {
        acc[day] = [];
      }
      acc[day].push(item);
      return acc;
    }, {} as Record<number, typeof schedule>);

    // Sort each day's schedule by start time
    Object.keys(groupedSchedule).forEach(day => {
      groupedSchedule[Number(day)].sort((a, b) => {
        const timeA = a.tuGio || '';
        const timeB = b.tuGio || '';
        return timeA.localeCompare(timeB);
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        schedule,
        groupedSchedule,
        date
      }
    });

  } catch (error) {
    console.error('Get schedule error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    const is401 = errorMessage.includes('401') || errorMessage.includes('Invalid JWT') || errorMessage.includes('Unauthorized');
    
    return NextResponse.json(
      { 
        success: false, 
        message: is401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : errorMessage,
        sessionExpired: is401
      },
      { status: is401 ? 401 : 500 }
    );
  }
}
