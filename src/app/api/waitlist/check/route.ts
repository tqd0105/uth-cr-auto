import { NextRequest, NextResponse } from 'next/server';
import { waitlistDb, userConfigDb, registrationLogDb, WaitlistStatus } from '@/lib/db-postgres';
import { getUTHApi } from '@/lib/services/uth-api';

// POST - Check and process waitlist for a user
export async function POST(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;
    
    if (!userSession) {
      return NextResponse.json(
        { success: false, message: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Get user config
    const userConfig = await userConfigDb.findBySession(userSession);
    if (!userConfig) {
      return NextResponse.json(
        { success: false, message: 'Phiên đăng nhập không hợp lệ' },
        { status: 401 }
      );
    }

    // Get waiting entries
    const waitingEntries = await waitlistDb.findWaitingByUser(userSession);
    
    if (waitingEntries.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Không có mục nào trong danh sách chờ',
        data: { processed: 0, registered: 0 }
      });
    }

    // Create UTH API instance
    const savedData = JSON.parse(userConfig.uth_cookies);
    const { authToken, ...cookies } = savedData;
    const uthApi = getUTHApi(cookies, authToken);

    let processed = 0;
    let registered = 0;
    const results: { classCode: string; status: string; message: string }[] = [];

    for (const entry of waitingEntries) {
      try {
        processed++;
        
        // Update last checked
        await waitlistDb.updateLastChecked(entry.id);

        // Get class info to check availability
        const classes = await uthApi.getClassSections(75, entry.course_code);
        const targetClass = classes.find(c => c.id.toString() === entry.class_id);

        if (!targetClass) {
          results.push({
            classCode: entry.class_code,
            status: 'not_found',
            message: 'Không tìm thấy lớp học phần'
          });
          continue;
        }

        // Check if registration is available
        if (!targetClass.choDangKy) {
          results.push({
            classCode: entry.class_code,
            status: 'full',
            message: 'Lớp đã đầy'
          });
          continue;
        }

        // Try to register
        console.log(`[Waitlist] Attempting registration for ${entry.class_code}`);
        
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
            message: 'Đăng ký tự động từ waitlist thành công'
          });

          registered++;
          results.push({
            classCode: entry.class_code,
            status: 'registered',
            message: 'Đăng ký thành công!'
          });
        } else {
          results.push({
            classCode: entry.class_code,
            status: 'failed',
            message: 'Đăng ký thất bại'
          });
        }

      } catch (err) {
        console.error(`[Waitlist] Error processing ${entry.class_code}:`, err);
        results.push({
          classCode: entry.class_code,
          status: 'error',
          message: err instanceof Error ? err.message : 'Lỗi không xác định'
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Đã xử lý ${processed} mục, đăng ký thành công ${registered} lớp`,
      data: { processed, registered, results }
    });

  } catch (error) {
    console.error('Process waitlist error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Lỗi không xác định' },
      { status: 500 }
    );
  }
}
