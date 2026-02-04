import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { siteSettingsDb } from '@/lib/db-postgres';

// GET - Lấy trạng thái maintenance mode
export async function GET(request: NextRequest) {
  // API này public để middleware có thể check
  try {
    const isMaintenanceMode = await siteSettingsDb.isMaintenanceMode();
    const maintenanceMessage = await siteSettingsDb.getMaintenanceMessage();
    
    return NextResponse.json({
      success: true,
      data: {
        maintenance_mode: isMaintenanceMode,
        maintenance_message: maintenanceMessage
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
    const { enabled, message } = body;

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Thiếu tham số enabled' },
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
