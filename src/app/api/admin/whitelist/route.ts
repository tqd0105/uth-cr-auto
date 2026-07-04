import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminSession } from '@/lib/admin-auth';

// GET - Lấy danh sách whitelist
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
    const showInactive = searchParams.get('showInactive') === 'true';
    const offset = (page - 1) * limit;

    let result;
    let countResult;

    if (search) {
      if (showInactive) {
        result = await sql`
          SELECT * FROM allowed_users
          WHERE student_id ILIKE ${'%' + search + '%'} 
             OR student_name ILIKE ${'%' + search + '%'}
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`
          SELECT COUNT(*) as total FROM allowed_users
          WHERE student_id ILIKE ${'%' + search + '%'} 
             OR student_name ILIKE ${'%' + search + '%'}
        `;
      } else {
        result = await sql`
          SELECT * FROM allowed_users
          WHERE is_active = true
          AND (student_id ILIKE ${'%' + search + '%'} 
             OR student_name ILIKE ${'%' + search + '%'})
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`
          SELECT COUNT(*) as total FROM allowed_users
          WHERE is_active = true
          AND (student_id ILIKE ${'%' + search + '%'} 
             OR student_name ILIKE ${'%' + search + '%'})
        `;
      }
    } else {
      if (showInactive) {
        result = await sql`
          SELECT * FROM allowed_users
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`SELECT COUNT(*) as total FROM allowed_users`;
      } else {
        result = await sql`
          SELECT * FROM allowed_users
          WHERE is_active = true
          ORDER BY created_at DESC
          LIMIT ${limit} OFFSET ${offset}
        `;
        countResult = await sql`SELECT COUNT(*) as total FROM allowed_users WHERE is_active = true`;
      }
    }

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Stats
    const statsResult = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active_count,
        SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive_count,
        SUM(CASE WHEN is_pro = true THEN 1 ELSE 0 END) as pro_count
      FROM allowed_users
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
    console.error('Get whitelist error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// POST - Thêm user vào whitelist
export async function POST(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { studentId, studentName, note } = body;

    if (!studentId) {
      return NextResponse.json(
        { success: false, message: 'Thiếu MSSV' },
        { status: 400 }
      );
    }

    // Check if already exists
    const existing = await sql`
      SELECT * FROM allowed_users WHERE student_id = ${studentId}
    `;

    if (existing.rows.length > 0) {
      // Reactivate if inactive
      if (!existing.rows[0].is_active) {
        await sql`
          UPDATE allowed_users 
          SET is_active = true, 
              student_name = COALESCE(${studentName}, student_name),
              note = COALESCE(${note}, note),
              updated_at = CURRENT_TIMESTAMP
          WHERE student_id = ${studentId}
        `;
        return NextResponse.json({
          success: true,
          message: 'Đã kích hoạt lại tài khoản'
        });
      }
      return NextResponse.json(
        { success: false, message: 'MSSV đã tồn tại trong whitelist' },
        { status: 400 }
      );
    }

    await sql`
      INSERT INTO allowed_users (student_id, student_name, note, added_by)
      VALUES (${studentId}, ${studentName || null}, ${note || null}, 'admin')
    `;

    return NextResponse.json({
      success: true,
      message: 'Đã thêm vào whitelist'
    });
  } catch (error) {
    console.error('Add to whitelist error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// PATCH - Cập nhật user trong whitelist
export async function PATCH(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, studentName, note, isActive, isPro } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID' },
        { status: 400 }
      );
    }

    await sql`
      UPDATE allowed_users 
      SET 
        student_name = COALESCE(${studentName}, student_name),
        note = COALESCE(${note}, note),
        is_active = COALESCE(${isActive}, is_active),
        is_pro = COALESCE(${isPro}, is_pro),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: 'Đã cập nhật'
    });
  } catch (error) {
    console.error('Update whitelist error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa user khỏi whitelist (soft delete - set inactive)
export async function DELETE(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const permanent = searchParams.get('permanent') === 'true';

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Thiếu ID' },
        { status: 400 }
      );
    }

    if (permanent) {
      await sql`DELETE FROM allowed_users WHERE id = ${parseInt(id)}`;
    } else {
      await sql`
        UPDATE allowed_users 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = ${parseInt(id)}
      `;
    }

    return NextResponse.json({
      success: true,
      message: permanent ? 'Đã xóa vĩnh viễn' : 'Đã vô hiệu hóa'
    });
  } catch (error) {
    console.error('Delete from whitelist error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
