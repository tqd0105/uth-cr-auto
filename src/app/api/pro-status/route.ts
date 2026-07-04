import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// GET - Kiểm tra trạng thái Pro của user hiện tại
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json({
        success: true,
        data: {
          is_pro: false,
          message: 'Chưa đăng nhập'
        }
      });
    }

    // Parse student_id từ session (format: uth_session_STUDENTID_timestamp)
    const parts = userSession.split('_');
    const studentId = parts.length >= 3 ? parts[2] : null;

    if (!studentId) {
      return NextResponse.json({
        success: true,
        data: {
          is_pro: false,
          message: 'Không xác định được MSSV'
        }
      });
    }

    // Kiểm tra trong allowed_users
    const result = await sql`
      SELECT is_pro, student_name FROM allowed_users 
      WHERE student_id = ${studentId} 
      AND is_active = true
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          is_pro: false,
          message: 'Tài khoản không trong whitelist'
        }
      });
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        is_pro: user.is_pro === true,
        student_id: studentId,
        student_name: user.student_name
      }
    });

  } catch (error) {
    console.error('Get pro status error:', error);
    return NextResponse.json({
      success: true,
      data: {
        is_pro: false,
        message: 'Lỗi khi kiểm tra trạng thái Pro'
      }
    });
  }
}
