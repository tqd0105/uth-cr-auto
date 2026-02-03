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

    const url = new URL(request.url);
    const idLopHocPhan = url.searchParams.get('idLopHocPhan');

    if (!idLopHocPhan) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID lớp học phần' },
        { status: 400 }
      );
    }

    const uthApi = await getAuthenticatedUTHApi(userSession);
    const scheduleDetail = await uthApi.getClassScheduleDetail(parseInt(idLopHocPhan));

    return NextResponse.json({
      success: true,
      data: scheduleDetail
    });

  } catch (error) {
    console.error('Get class schedule detail error:', error);
    
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}
