import { NextRequest, NextResponse } from 'next/server';
import { createPortalBridgeToken } from '@/lib/portal-bridge-token';

export async function GET(request: NextRequest) {
  const userSession = request.cookies.get('user-session')?.value;

  if (!userSession) {
    return NextResponse.json(
      { success: false, message: 'Chưa đăng nhập' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    token: createPortalBridgeToken(userSession),
    expiresIn: 15 * 60
  });
}
