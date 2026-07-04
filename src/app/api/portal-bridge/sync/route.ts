import { NextRequest, NextResponse } from 'next/server';
import { portalBridgeDb } from '@/lib/db-postgres';
import { verifyPortalBridgeToken } from '@/lib/portal-bridge-token';
import type { PortalBridgeSnapshot } from '@/lib/types/uth';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

interface BridgeSyncBody {
  bridgeToken?: string;
  studentId?: string;
  snapshot?: Partial<PortalBridgeSnapshot>;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as BridgeSyncBody;
    const authHeader = request.headers.get('authorization');
    const bridgeToken = body.bridgeToken || authHeader?.replace(/^Bearer\s+/i, '');

    if (!bridgeToken) {
      return NextResponse.json(
        { success: false, message: 'Thiếu bridge token' },
        { status: 401, headers: corsHeaders }
      );
    }

    const tokenPayload = verifyPortalBridgeToken(bridgeToken);
    if (!tokenPayload) {
      return NextResponse.json(
        { success: false, message: 'Bridge token không hợp lệ hoặc đã hết hạn' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!body.snapshot) {
      return NextResponse.json(
        { success: false, message: 'Thiếu dữ liệu đồng bộ' },
        { status: 400, headers: corsHeaders }
      );
    }

    const existingSnapshot = await portalBridgeDb.findBySession(tokenPayload.userSession);
    const snapshot: PortalBridgeSnapshot = {
      idDot: body.snapshot.idDot ?? existingSnapshot?.idDot ?? null,
      periods: body.snapshot.periods ?? existingSnapshot?.periods ?? [],
      availableCourses: body.snapshot.availableCourses ?? existingSnapshot?.availableCourses ?? [],
      registeredCourses: body.snapshot.registeredCourses ?? existingSnapshot?.registeredCourses ?? [],
      classSections: {
        ...(existingSnapshot?.classSections || {}),
        ...(body.snapshot.classSections || {})
      },
      studentInfo: body.snapshot.studentInfo ?? existingSnapshot?.studentInfo ?? null,
      studentImage: body.snapshot.studentImage ?? existingSnapshot?.studentImage ?? null,
      syncedAt: new Date().toISOString()
    };

    await portalBridgeDb.upsert(tokenPayload.userSession, body.studentId || null, snapshot);

    return NextResponse.json(
      { success: true, syncedAt: snapshot.syncedAt },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Portal bridge sync error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi đồng bộ bridge' },
      { status: 500, headers: corsHeaders }
    );
  }
}
