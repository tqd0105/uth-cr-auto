import { NextRequest, NextResponse } from 'next/server';
import { scheduleNotificationDb, userConfigDb } from '@/lib/db';
import { emailService } from '@/lib/services/email';
import { UTHApiService } from '@/lib/services/uth-api';
import { parseCookieString } from '@/lib/utils';

// This endpoint should be called by a cron job to send schedule notifications
// POST /api/schedule/notifications/send

export async function POST(request: NextRequest) {
  try {
    // Verify API key for cron job (optional but recommended for security)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const dayOfWeek = now.getDay(); // 0 = Sunday

    // Get all enabled notifications
    const enabledNotifications = scheduleNotificationDb.findAllEnabled();
    
    const results = {
      total: enabledNotifications.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as Array<{ email: string; status: string; error?: string }>
    };

    for (const notification of enabledNotifications) {
      try {
        // Check if it's time to send notification
        const notificationTime = notification.notification_time || '07:00';
        
        // For weekly notifications, only send on Sunday (day 0)
        if (notification.notification_type === 'weekly' && dayOfWeek !== 0) {
          results.skipped++;
          results.details.push({ email: notification.email, status: 'skipped', error: 'Not Sunday for weekly notification' });
          continue;
        }

        // Check if notification time matches (with 5-minute tolerance)
        const [notifHour, notifMinute] = notificationTime.split(':').map(Number);
        const notifDate = new Date(now);
        notifDate.setHours(notifHour, notifMinute, 0, 0);
        
        const timeDiff = Math.abs(now.getTime() - notifDate.getTime());
        const fiveMinutes = 5 * 60 * 1000;
        
        if (timeDiff > fiveMinutes) {
          results.skipped++;
          results.details.push({ email: notification.email, status: 'skipped', error: `Not time yet (${notificationTime})` });
          continue;
        }

        // Get user's UTH cookies
        const userConfig = userConfigDb.findBySession(notification.user_session);
        if (!userConfig || !userConfig.uth_cookies) {
          results.failed++;
          results.details.push({ email: notification.email, status: 'failed', error: 'No user config found' });
          continue;
        }

        // Parse cookies and create API instance
        const cookies = parseCookieString(userConfig.uth_cookies);
        const token = cookies['Authorization'] || cookies['auth_token'] || '';
        const uthApi = new UTHApiService(cookies, token);

        // Get schedule based on notification type
        if (notification.notification_type === 'daily') {
          // Get today's or tomorrow's schedule based on send_day_before setting
          let targetDate = new Date(now);
          if (notification.send_day_before) {
            targetDate.setDate(targetDate.getDate() + 1);
          }
          const dateStr = targetDate.toISOString().split('T')[0];
          
          const schedule = await uthApi.getLichHoc(dateStr);
          
          // Filter to only get classes for the target day
          const targetDayOfWeek = targetDate.getDay() === 0 ? 1 : targetDate.getDay() + 1; // Convert to UTH format
          const todaySchedule = schedule.filter(s => s.thu === targetDayOfWeek);
          
          // Send email
          const sent = await emailService.sendDailyScheduleNotification(
            notification.email,
            todaySchedule,
            dateStr,
            notification.custom_title
          );

          if (sent) {
            scheduleNotificationDb.updateLastSent(notification.user_session);
            results.sent++;
            results.details.push({ email: notification.email, status: 'sent' });
          } else {
            results.failed++;
            results.details.push({ email: notification.email, status: 'failed', error: 'Email service error' });
          }
        } else {
          // Weekly notification - get the whole week
          const monday = getMonday(now);
          const dateStr = monday.toISOString().split('T')[0];
          
          const schedule = await uthApi.getLichHoc(dateStr);
          
          // Group by day
          const groupedSchedule: Record<number, typeof schedule> = {};
          for (const item of schedule) {
            if (!groupedSchedule[item.thu]) {
              groupedSchedule[item.thu] = [];
            }
            groupedSchedule[item.thu].push(item);
          }

          // Get week range
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          const weekRange = `${monday.toLocaleDateString('vi-VN')} - ${sunday.toLocaleDateString('vi-VN')}`;

          // Send email
          const sent = await emailService.sendWeeklyScheduleNotification(
            notification.email,
            groupedSchedule,
            weekRange,
            notification.custom_title
          );

          if (sent) {
            scheduleNotificationDb.updateLastSent(notification.user_session);
            results.sent++;
            results.details.push({ email: notification.email, status: 'sent' });
          } else {
            results.failed++;
            results.details.push({ email: notification.email, status: 'failed', error: 'Email service error' });
          }
        }
      } catch (error) {
        console.error(`Error sending notification to ${notification.email}:`, error);
        results.failed++;
        results.details.push({ 
          email: notification.email, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${results.total} notifications`,
      data: results
    });

  } catch (error) {
    console.error('Send notifications error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi gửi thông báo' },
      { status: 500 }
    );
  }
}

// Helper function to get Monday of the week
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
