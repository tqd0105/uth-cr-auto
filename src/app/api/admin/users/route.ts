import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminSession } from '@/lib/admin-auth';

// GET - Lấy danh sách users (từ login_history)
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

    // Get unique users with their last login
    let result;
    let countResult;

    if (search) {
      result = await sql`
        SELECT 
          student_id,
          MAX(student_name) as student_name,
          COUNT(*) as login_count,
          MAX(login_time) as last_login,
          MIN(login_time) as first_login,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_count
        FROM login_history
        WHERE student_id ILIKE ${'%' + search + '%'} 
           OR student_name ILIKE ${'%' + search + '%'}
        GROUP BY student_id
        ORDER BY last_login DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      countResult = await sql`
        SELECT COUNT(DISTINCT student_id) as total 
        FROM login_history
        WHERE student_id ILIKE ${'%' + search + '%'} 
           OR student_name ILIKE ${'%' + search + '%'}
      `;
    } else {
      result = await sql`
        SELECT 
          student_id,
          MAX(student_name) as student_name,
          COUNT(*) as login_count,
          MAX(login_time) as last_login,
          MIN(login_time) as first_login,
          SUM(CASE WHEN success = true THEN 1 ELSE 0 END) as success_count,
          SUM(CASE WHEN success = false THEN 1 ELSE 0 END) as failed_count
        FROM login_history
        GROUP BY student_id
        ORDER BY last_login DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      countResult = await sql`SELECT COUNT(DISTINCT student_id) as total FROM login_history`;
    }

    const total = parseInt(countResult.rows[0]?.total || '0');

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
