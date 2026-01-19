import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Phiên bản điều khoản hiện tại - cập nhật khi thay đổi điều khoản
const CURRENT_TERMS_VERSION = '1.0';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sessionId, 
      screenResolution, 
      timezone, 
      language,
      studentId,
      studentName,
      consentVersion,
      acceptedAt
    } = body;

    // Lấy IP từ headers - Vercel cung cấp nhiều header khác nhau
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const vercelIp = request.headers.get('x-vercel-forwarded-for');
    const cfConnectingIp = request.headers.get('cf-connecting-ip'); // Cloudflare
    
    // Ưu tiên các header theo thứ tự
    let ipAddress = vercelIp || forwardedFor?.split(',')[0]?.trim() || realIp || cfConnectingIp || 'unknown';
    
    // Nếu là localhost (dev), ghi nhận rõ ràng
    if (ipAddress === '::1' || ipAddress === '127.0.0.1') {
      ipAddress = `localhost (${ipAddress})`;
    }

    // Lấy User Agent
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Lưu vào database
    await sql`
      INSERT INTO consent_logs (
        session_id, 
        ip_address, 
        user_agent, 
        screen_resolution, 
        timezone, 
        language, 
        consent_version,
        student_id,
        student_name,
        accepted_at
      )
      VALUES (
        ${sessionId || 'anonymous-' + Date.now()},
        ${ipAddress},
        ${userAgent},
        ${screenResolution || 'unknown'},
        ${timezone || 'unknown'},
        ${language || 'unknown'},
        ${consentVersion || CURRENT_TERMS_VERSION},
        ${studentId || null},
        ${studentName || null},
        ${acceptedAt ? new Date(acceptedAt).toISOString() : new Date().toISOString()}
      )
    `;

    return NextResponse.json({
      success: true,
      message: 'Đã ghi nhận đồng ý điều khoản',
      version: CURRENT_TERMS_VERSION
    });
  } catch (error) {
    console.error('Consent log error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi ghi nhận' },
      { status: 500 }
    );
  }
}

// GET - Lấy danh sách consent logs (admin only)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const studentId = searchParams.get('studentId');

    let result;
    if (studentId) {
      result = await sql`
        SELECT * FROM consent_logs 
        WHERE student_id = ${studentId}
        ORDER BY accepted_at DESC
        LIMIT ${limit}
      `;
    } else {
      result = await sql`
        SELECT * FROM consent_logs 
        ORDER BY accepted_at DESC
        LIMIT ${limit}
      `;
    }

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error('Get consent logs error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
