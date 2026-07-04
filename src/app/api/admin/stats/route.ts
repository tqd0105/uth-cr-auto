import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { verifyAdminSession } from '@/lib/admin-auth';

// GET - Lấy thống kê tổng quan cho dashboard
export async function GET(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Total unique users (from login history)
    const usersResult = await sql`
      SELECT COUNT(DISTINCT student_id) as total FROM login_history
    `;

    // Total logins today
    const todayLoginsResult = await sql`
      SELECT COUNT(*) as total FROM login_history 
      WHERE login_time >= CURRENT_DATE
    `;

    // Total consents
    const consentsResult = await sql`
      SELECT COUNT(*) as total FROM consent_logs WHERE student_id IS NOT NULL
    `;

    // Reports stats
    const reportsResult = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM issue_reports
    `;

    // Whitelist stats
    const whitelistResult = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active
      FROM allowed_users
    `;

    // Access requests stats
    const accessRequestsResult = await sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
      FROM access_requests
    `;

    // Recent users (last 5 users logged in)
    const recentUsersResult = await sql`
      SELECT DISTINCT ON (student_id) 
        student_id, 
        student_name, 
        login_time,
        success
      FROM login_history
      ORDER BY student_id, login_time DESC
      LIMIT 5
    `;

    // Total logins (all time)
    const totalLoginsResult = await sql`
      SELECT COUNT(*) as total FROM login_history WHERE success = true
    `;

    // Failed logins today
    const failedLoginsResult = await sql`
      SELECT COUNT(*) as total FROM login_history 
      WHERE login_time >= CURRENT_DATE AND success = false
    `;

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: parseInt(usersResult.rows[0]?.total || '0'),
        todayLogins: parseInt(todayLoginsResult.rows[0]?.total || '0'),
        totalConsents: parseInt(consentsResult.rows[0]?.total || '0'),
        totalLogins: parseInt(totalLoginsResult.rows[0]?.total || '0'),
        failedLoginsToday: parseInt(failedLoginsResult.rows[0]?.total || '0'),
        reports: {
          total: parseInt(reportsResult.rows[0]?.total || '0'),
          pending: parseInt(reportsResult.rows[0]?.pending || '0')
        },
        whitelist: {
          total: parseInt(whitelistResult.rows[0]?.total || '0'),
          active: parseInt(whitelistResult.rows[0]?.active || '0')
        },
        accessRequests: {
          total: parseInt(accessRequestsResult.rows[0]?.total || '0'),
          pending: parseInt(accessRequestsResult.rows[0]?.pending || '0')
        },
        recentUsers: recentUsersResult.rows
      }
    });
  } catch (error) {
    console.error('Get admin stats error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
