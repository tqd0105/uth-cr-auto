import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminSession } from '@/lib/admin-auth';

// GET - Lấy danh sách consent logs
export async function GET(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const offset = (page - 1) * limit;

    let result;
    let countResult;

    if (search) {
      result = await sql`
        SELECT * FROM consent_logs
        WHERE student_id ILIKE ${'%' + search + '%'} 
           OR student_name ILIKE ${'%' + search + '%'}
           OR ip_address ILIKE ${'%' + search + '%'}
        ORDER BY accepted_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      countResult = await sql`
        SELECT COUNT(*) as total FROM consent_logs
        WHERE student_id ILIKE ${'%' + search + '%'} 
           OR student_name ILIKE ${'%' + search + '%'}
           OR ip_address ILIKE ${'%' + search + '%'}
      `;
    } else {
      result = await sql`
        SELECT * FROM consent_logs
        ORDER BY accepted_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      countResult = await sql`SELECT COUNT(*) as total FROM consent_logs`;
    }

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Stats
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total_consents,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM consent_logs
      WHERE student_id IS NOT NULL
    `;

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats: statsResult.rows[0],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get consent logs error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
