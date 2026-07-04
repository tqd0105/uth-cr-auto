import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET - Kiểm tra xem MSSV có trong whitelist không
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

    if (!studentId) {
      return NextResponse.json(
        { allowed: false, message: 'Thiếu MSSV' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT * FROM allowed_users 
      WHERE student_id = ${studentId} AND is_active = true
    `;

    if (result.rows.length > 0) {
      return NextResponse.json({ allowed: true });
    }

    return NextResponse.json({ 
      allowed: false, 
      message: 'Tài khoản chưa được cấp quyền sử dụng hệ thống' 
    });
  } catch (error) {
    console.error('Check whitelist error:', error);
    // Nếu lỗi database, mặc định cho phép (tránh block tất cả users)
    return NextResponse.json({ allowed: true });
  }
}
