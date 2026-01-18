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
    const idDot = url.searchParams.get('idDot') || '75';
    const maHocPhan = url.searchParams.get('maHocPhan');
    const isLocTrung = url.searchParams.get('isLocTrung') === 'true';
    const isLocTrungWithoutElearning = url.searchParams.get('isLocTrungWithoutElearning') === 'true';

    if (!maHocPhan) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã học phần' },
        { status: 400 }
      );
    }

    const uthApi = await getAuthenticatedUTHApi(userSession);
    const classes = await uthApi.getClassSections(
      parseInt(idDot),
      maHocPhan,
      isLocTrung,
      isLocTrungWithoutElearning
    );

    return NextResponse.json({
      success: true,
      data: classes
    });

  } catch (error) {
    console.error('Get class sections error:', error);
    
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}