import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { waitlistDb, userConfigDb, registrationLogDb, WaitlistStatus } from '@/lib/db-postgres';
import { getUTHApi } from '@/lib/services/uth-api';

// Cron job để tự động kiểm tra và đăng ký waitlist
// Được gọi bởi cron-job.org mỗi 1 phút
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (optional security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    // Nếu có CRON_SECRET, kiểm tra authorization
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Cron Waitlist] Starting automatic waitlist check...');

    // Lấy tất cả waitlist entries đang chờ từ tất cả users
    const result = await sql`
      SELECT DISTINCT w.*, uc.uth_cookies 
      FROM waitlist w
      JOIN user_configs uc ON w.user_session = uc.user_session
      WHERE w.status = 'waiting'
      ORDER BY w.priority ASC, w.created_at ASC
    `;

    const entries = result.rows;
    
    if (entries.length === 0) {
      console.log('[Cron Waitlist] No waiting entries found');
      return NextResponse.json({
        success: true,
        message: 'Không có mục nào trong danh sách chờ',
        data: { processed: 0, registered: 0 }
      });
    }

    console.log(`[Cron Waitlist] Found ${entries.length} waiting entries`);

    let processed = 0;
    let registered = 0;
    const results: { userSession: string; classCode: string; status: string; message: string }[] = [];

    // Group by user to reuse API instance
    const entriesByUser = entries.reduce((acc, entry) => {
      if (!acc[entry.user_session]) {
        acc[entry.user_session] = {
          uthCookies: entry.uth_cookies,
          entries: []
        };
      }
      acc[entry.user_session].entries.push(entry);
      return acc;
    }, {} as Record<string, { uthCookies: string; entries: typeof entries }>);

    // Process each user's waitlist
    for (const [userSession, userData] of Object.entries(entriesByUser)) {
      try {
        // Create UTH API instance for this user
        const savedData = JSON.parse(userData.uthCookies);
        const { authToken, ...cookies } = savedData;
        const uthApi = getUTHApi(cookies, authToken);

        for (const entry of userData.entries) {
          try {
            processed++;
            
            // Update last checked
            await waitlistDb.updateLastChecked(entry.id);

            // Get class info to check availability
            const classes = await uthApi.getClassSections(75, entry.course_code);
            const targetClass = classes.find(c => c.id.toString() === entry.class_id);

            if (!targetClass) {
              console.log(`[Cron Waitlist] Class ${entry.class_code} not found`);
              results.push({
                userSession: userSession.substring(0, 8) + '...',
                classCode: entry.class_code,
                status: 'not_found',
                message: 'Không tìm thấy lớp học phần'
              });
              continue;
            }

            // Check if registration is available
            if (!targetClass.choDangKy) {
              console.log(`[Cron Waitlist] Class ${entry.class_code} is full (${targetClass.phanTramDangKy}%)`);
              results.push({
                userSession: userSession.substring(0, 8) + '...',
                classCode: entry.class_code,
                status: 'full',
                message: `Lớp đã đầy (${targetClass.phanTramDangKy}%)`
              });
              continue;
            }

            // Có chỗ trống! Thử đăng ký
            console.log(`[Cron Waitlist] Slot available for ${entry.class_code}! Attempting registration...`);
            
            const success = await uthApi.registerForClass({
              idLopHocPhan: parseInt(entry.class_id),
              'g-recaptcha-response': ''
            });

            if (success) {
              // Update waitlist status
              await waitlistDb.updateStatus(entry.id, WaitlistStatus.REGISTERED);
              
              // Log success
              await registrationLogDb.insert({
                user_session: userSession,
                action: 'register',
                course_name: entry.course_name,
                class_code: entry.class_code,
                status: 'success',
                message: 'Đăng ký tự động từ cron job thành công'
              });

              registered++;
              console.log(`[Cron Waitlist] Successfully registered ${entry.class_code}!`);
              results.push({
                userSession: userSession.substring(0, 8) + '...',
                classCode: entry.class_code,
                status: 'registered',
                message: 'Đăng ký thành công!'
              });
            } else {
              console.log(`[Cron Waitlist] Registration failed for ${entry.class_code}`);
              results.push({
                userSession: userSession.substring(0, 8) + '...',
                classCode: entry.class_code,
                status: 'failed',
                message: 'Đăng ký thất bại'
              });
            }

          } catch (err) {
            console.error(`[Cron Waitlist] Error processing ${entry.class_code}:`, err);
            results.push({
              userSession: userSession.substring(0, 8) + '...',
              classCode: entry.class_code,
              status: 'error',
              message: err instanceof Error ? err.message : 'Lỗi không xác định'
            });
          }
        }

      } catch (userErr) {
        console.error(`[Cron Waitlist] Error processing user ${userSession.substring(0, 8)}:`, userErr);
      }
    }

    const summary = `[Cron Waitlist] Completed: ${processed} processed, ${registered} registered`;
    console.log(summary);

    return NextResponse.json({
      success: true,
      message: summary,
      data: { processed, registered, results },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Cron Waitlist] Fatal error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}
