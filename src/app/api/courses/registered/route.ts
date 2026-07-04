import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUTHApi } from '@/lib/api-helpers';
import { portalBridgeDb } from '@/lib/db-postgres';

export async function GET(request: NextRequest) {
  let userSession: string | undefined;

  try {
    userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    const uthApi = await getAuthenticatedUTHApi(userSession);
    const url = new URL(request.url);
    const idDotParam = url.searchParams.get('idDot');
    const idDot = idDotParam ? parseInt(idDotParam, 10) : await uthApi.getActiveRegistrationPeriodId();
    const registeredCourses = await uthApi.getRegisteredCourses(idDot);

    return NextResponse.json({
      success: true,
      idDot,
      data: registeredCourses
    });

  } catch (error) {
    console.error('Get registered courses error:', error);
    
    // Check for 401 errors - session expired
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    const is401 = errorMessage.includes('401') || errorMessage.includes('Invalid JWT') || errorMessage.includes('Unauthorized');

    if (userSession && !is401) {
      const snapshot = await portalBridgeDb.findBySession(userSession);
      if (snapshot?.registeredCourses) {
        return NextResponse.json({
          success: true,
          fromBridge: true,
          idDot: snapshot.idDot,
          syncedAt: snapshot.syncedAt,
          data: snapshot.registeredCourses
        });
      }
    }
    
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
