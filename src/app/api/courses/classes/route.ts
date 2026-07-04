import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUTHApi } from '@/lib/api-helpers';
import { portalBridgeDb } from '@/lib/db-postgres';

export async function GET(request: NextRequest) {
  let userSession: string | undefined;
  let maHocPhan: string | null = null;

  try {
    userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const idDotParam = url.searchParams.get('idDot');
    maHocPhan = url.searchParams.get('maHocPhan');
    const isLocTrung = url.searchParams.get('isLocTrung') === 'true';
    const isLocTrungWithoutElearning = url.searchParams.get('isLocTrungWithoutElearning') === 'true';

    if (!maHocPhan) {
      return NextResponse.json(
        { success: false, message: 'Thiếu mã học phần' },
        { status: 400 }
      );
    }

    const uthApi = await getAuthenticatedUTHApi(userSession);
    const idDot = idDotParam ? parseInt(idDotParam, 10) : await uthApi.getActiveRegistrationPeriodId();
    const classes = await uthApi.getClassSections(
      idDot,
      maHocPhan,
      isLocTrung,
      isLocTrungWithoutElearning
    );

    return NextResponse.json({
      success: true,
      idDot,
      data: classes
    });

  } catch (error) {
    console.error('Get class sections error:', error);

    if (userSession && maHocPhan) {
      const snapshot = await portalBridgeDb.findBySession(userSession);
      const cachedClasses = snapshot?.classSections?.[maHocPhan];
      if (cachedClasses) {
        return NextResponse.json({
          success: true,
          fromBridge: true,
          idDot: snapshot.idDot,
          syncedAt: snapshot.syncedAt,
          data: cachedClasses
        });
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Lỗi không xác định',
        bridgeHint: 'Nếu UTH chặn Cloudflare, hãy mở extension UTH Portal Bridge và sync lớp cho mã học phần này.'
      },
      { status: 500 }
    );
  }
}
