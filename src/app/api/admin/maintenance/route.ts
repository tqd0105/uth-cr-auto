import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { siteSettingsDb } from '@/lib/db-postgres';

// GET - Lấy trạng thái maintenance mode & site hidden
export async function GET(request: NextRequest) {
  // API này public để middleware có thể check
  try {
    const isMaintenanceMode = await siteSettingsDb.isMaintenanceMode();
    const maintenanceMessage = await siteSettingsDb.getMaintenanceMessage();
    const siteHidden = await siteSettingsDb.get('site_hidden');
    
    return NextResponse.json({
      success: true,
      data: {
        maintenance_mode: isMaintenanceMode,
        maintenance_message: maintenanceMessage,
        site_hidden: siteHidden === 'true'
      }
    });
  } catch (error) {
    console.error('Get maintenance status error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// POST - Bật/tắt maintenance mode (chỉ admin)
export async function POST(request: NextRequest) {
  // Verify admin
  if (!await verifyAdminSession(request)) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { enabled, message, site_hidden } = body;

    // Handle site_hidden toggle
    if (typeof site_hidden === 'boolean') {
      await siteSettingsDb.set('site_hidden', site_hidden ? 'true' : 'false');
      return NextResponse.json({
        success: true,
        message: site_hidden ? 'Đã ẩn trang web' : 'Đã hiện trang web'
      });
    }

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Thiếu tham số enabled hoặc site_hidden' },
        { status: 400 }
      );
    }

    await siteSettingsDb.setMaintenanceMode(enabled, message);

    return NextResponse.json({
      success: true,
      message: enabled ? 'Đã bật chế độ bảo trì' : 'Đã tắt chế độ bảo trì'
    });
  } catch (error) {
    console.error('Set maintenance mode error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
