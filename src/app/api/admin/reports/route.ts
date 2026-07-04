import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminSession } from '@/lib/admin-auth';

// GET - Lấy danh sách báo cáo
export async function GET(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') || '';
    const offset = (page - 1) * limit;

    let result;
    let countResult;

    if (status) {
      result = await sql`
        SELECT * FROM issue_reports
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      countResult = await sql`
        SELECT COUNT(*) as total FROM issue_reports WHERE status = ${status}
      `;
    } else {
      result = await sql`
        SELECT * FROM issue_reports
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      
      countResult = await sql`SELECT COUNT(*) as total FROM issue_reports`;
    }

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Stats by status
    const statsResult = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM issue_reports
      GROUP BY status
    `;

    const stats = {
      total: 0,
      pending: 0,
      in_progress: 0,
      resolved: 0,
      closed: 0
    };

    statsResult.rows.forEach((row: any) => {
      const status = row.status as keyof typeof stats;
      if (status in stats && status !== 'total') {
        stats[status] = parseInt(row.count);
        stats.total += parseInt(row.count);
      }
    });

    return NextResponse.json({
      success: true,
      data: result.rows,
      stats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// PATCH - Cập nhật trạng thái báo cáo
export async function PATCH(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin' },
        { status: 400 }
      );
    }

    const validStatuses = ['pending', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE issue_reports 
      SET status = ${status}
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật trạng thái'
    });
  } catch (error) {
    console.error('Update report error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa báo cáo
export async function DELETE(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID' },
        { status: 400 }
      );
    }

    await sql`DELETE FROM issue_reports WHERE id = ${parseInt(id)}`;

    return NextResponse.json({
      success: true,
      message: 'Đã xóa báo cáo'
    });
  } catch (error) {
    console.error('Delete report error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
