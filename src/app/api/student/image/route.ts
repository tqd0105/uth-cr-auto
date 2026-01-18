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

    const uthApi = await getAuthenticatedUTHApi(userSession);
    const imageData = await uthApi.getStudentImage();

    return NextResponse.json({
      success: true,
      data: imageData
    });

  } catch (error) {
    console.error('Get student image error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
    const is401 = errorMessage.includes('401') || errorMessage.includes('Invalid JWT') || errorMessage.includes('Unauthorized');
    
    return NextResponse.json(
      { 
        success: false, 
        message: is401 ? 'Phiên đăng nhập đã hết hạn.' : errorMessage,
        sessionExpired: is401
      },
      { status: is401 ? 401 : 500 }
    );
  }
}
