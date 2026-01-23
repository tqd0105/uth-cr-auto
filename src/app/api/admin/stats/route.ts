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

    // Recent logins (last 7 days) - Generate all 7 days
    const recentLoginsResult = await sql`
      WITH date_series AS (
        SELECT generate_series(
          CURRENT_DATE - INTERVAL '6 days',
          CURRENT_DATE,
          '1 day'::interval
        )::date as date
      )
      SELECT 
        ds.date::text,
        COALESCE(COUNT(lh.id), 0)::integer as count
      FROM date_series ds
      LEFT JOIN login_history lh 
        ON DATE(lh.login_time AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Ho_Chi_Minh') = ds.date
      GROUP BY ds.date
      ORDER BY ds.date ASC
    `;

    console.log('Recent logins data:', recentLoginsResult.rows);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: parseInt(usersResult.rows[0]?.total || '0'),
        todayLogins: parseInt(todayLoginsResult.rows[0]?.total || '0'),
        totalConsents: parseInt(consentsResult.rows[0]?.total || '0'),
        reports: {
          total: parseInt(reportsResult.rows[0]?.total || '0'),
          pending: parseInt(reportsResult.rows[0]?.pending || '0')
        },
        whitelist: {
          total: parseInt(whitelistResult.rows[0]?.total || '0'),
          active: parseInt(whitelistResult.rows[0]?.active || '0')
        },
        recentLogins: recentLoginsResult.rows
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
