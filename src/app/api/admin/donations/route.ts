import { NextRequest, NextResponse } from 'next/server';
import { donationDb } from '@/lib/db';
import type { DonationStatus } from '@/lib/types/uth';

// GET - Get all donations for admin
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as DonationStatus | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const donations = donationDb.getAll(status, page, limit);
    const stats = donationDb.getStats();

    return NextResponse.json({
      success: true,
      data: {
        donations,
        stats,
        page,
        limit
      }
    });

  } catch (error) {
    console.error('Admin get donations error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy danh sách donations' },
      { status: 500 }
    );
  }
}

// PUT - Update donation status (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, approved_by, note } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, message: 'Trạng thái không hợp lệ' },
        { status: 400 }
      );
    }

    const updated = donationDb.updateStatus(id, status, approved_by, note);

    if (!updated) {
      return NextResponse.json(
        { success: false, message: 'Không tìm thấy donation' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: status === 'approved' ? 'Đã duyệt donation' : 'Đã từ chối donation'
    });

  } catch (error) {
    console.error('Admin update donation error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi cập nhật donation' },
      { status: 500 }
    );
  }
}
