import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminSession } from '@/lib/admin-auth';
import { emailService } from '@/lib/services/email';

// GET - Lấy danh sách yêu cầu cấp quyền
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
        SELECT * FROM access_requests
        WHERE status = ${status}
        ORDER BY created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await sql`
        SELECT COUNT(*) as total FROM access_requests WHERE status = ${status}
      `;
    } else {
      result = await sql`
        SELECT * FROM access_requests
        ORDER BY 
          CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
          created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
      countResult = await sql`SELECT COUNT(*) as total FROM access_requests`;
    }

    const total = parseInt(countResult.rows[0]?.total || '0');

    // Stats
    const statsResult = await sql`
      SELECT 
        status,
        COUNT(*) as count
      FROM access_requests
      GROUP BY status
    `;

    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };

    statsResult.rows.forEach((row) => {
      const statusKey = row.status as keyof typeof stats;
      if (statusKey in stats && statusKey !== 'total') {
        stats[statusKey] = parseInt(row.count as string);
        stats.total += parseInt(row.count as string);
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
    console.error('Get access requests error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// PATCH - Duyệt/từ chối yêu cầu
export async function PATCH(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, action, adminNote } = body;

    if (!id || !action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Dữ liệu không hợp lệ' },
        { status: 400 }
      );
    }

    // Get the request first
    const requestResult = await sql`
      SELECT * FROM access_requests WHERE id = ${id}
    `;

    if (requestResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy yêu cầu' },
        { status: 404 }
      );
    }

    const accessRequest = requestResult.rows[0];

    if (accessRequest.status !== 'pending') {
      return NextResponse.json(
        { success: false, message: 'Yêu cầu đã được xử lý trước đó' },
        { status: 400 }
      );
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    // Update request status
    await sql`
      UPDATE access_requests 
      SET status = ${newStatus}, 
          admin_note = ${adminNote || null},
          reviewed_at = CURRENT_TIMESTAMP,
          reviewed_by = 'admin'
      WHERE id = ${id}
    `;

    // If approved, add to whitelist
    if (action === 'approve') {
      // Check if already in whitelist
      const existingUser = await sql`
        SELECT * FROM allowed_users WHERE student_id = ${accessRequest.student_id}
      `;

      if (existingUser.rows.length > 0) {
        // Reactivate if existed
        await sql`
          UPDATE allowed_users 
          SET is_active = true, 
              student_name = ${accessRequest.student_name},
              note = ${adminNote || 'Đã duyệt từ yêu cầu'},
              updated_at = CURRENT_TIMESTAMP
          WHERE student_id = ${accessRequest.student_id}
        `;
      } else {
        // Insert new
        await sql`
          INSERT INTO allowed_users (student_id, student_name, note, added_by)
          VALUES (${accessRequest.student_id}, ${accessRequest.student_name}, ${adminNote || 'Đã duyệt từ yêu cầu'}, 'admin')
        `;
      }
    }

    // Send email to user if they provided email
    if (accessRequest.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://uth-cr-auto.vercel.app';
      
      if (action === 'approve') {
        await emailService.sendEmail({
          to: accessRequest.email,
          subject: '[UTH Auto] Yêu cầu cấp quyền đã được phê duyệt',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #059669;"><img src="${appUrl}/check.png" width="25" height="25" alt="Approved" style="vertical-align: middle; margin-right: 8px;" /> Yêu cầu được phê duyệt!</h2>
              <p>Xin chào <strong>${accessRequest.student_name}</strong>,</p>
              <p>Yêu cầu cấp quyền truy cập của bạn đã được <strong style="color: #059669;">PHÊ DUYỆT</strong>.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>MSSV:</strong> ${accessRequest.student_id}</p>
                ${adminNote ? `<p><strong>Ghi chú từ admin:</strong> ${adminNote}</p>` : ''}
              </div>
              <p>Bạn có thể đăng nhập ngay tại:</p>
              <p><a href="${appUrl}" style="display: inline-block; background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Đăng nhập ngay</a></p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Email này được gửi tự động, vui lòng không reply.
              </p>
            </div>
          `
        });
      } else {
        await emailService.sendEmail({
          to: accessRequest.email,
          subject: '[UTH Auto] Yêu cầu cấp quyền bị từ chối',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;"><img src="${appUrl}/close.png" width="25" height="25" alt="Rejected" style="vertical-align: middle; margin-right: 8px;" onerror="this.style.display='none'" /> Yêu cầu bị từ chối</h2>
              <p>Xin chào <strong>${accessRequest.student_name}</strong>,</p>
              <p>Rất tiếc, yêu cầu cấp quyền truy cập của bạn đã bị <strong style="color: #dc2626;">TỪ CHỐI</strong>.</p>
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>MSSV:</strong> ${accessRequest.student_id}</p>
                ${adminNote ? `<p><strong>Lý do:</strong> ${adminNote}</p>` : ''}
              </div>
              <p>Nếu bạn có thắc mắc, vui lòng liên hệ admin để biết thêm chi tiết.</p>
              <p style="color: #666; font-size: 12px; margin-top: 30px;">
                Email này được gửi tự động, vui lòng không reply.
              </p>
            </div>
          `
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Đã duyệt yêu cầu' : 'Đã từ chối yêu cầu'
    });

  } catch (error) {
    console.error('Update access request error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// DELETE - Xóa yêu cầu
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

    await sql`DELETE FROM access_requests WHERE id = ${parseInt(id)}`;

    return NextResponse.json({
      success: true,
      message: 'Đã xóa yêu cầu'
    });

  } catch (error) {
    console.error('Delete access request error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
