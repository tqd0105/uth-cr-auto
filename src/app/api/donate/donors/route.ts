import { NextRequest, NextResponse } from 'next/server';
import { donationDb } from '@/lib/db';

// GET - Get top donors and stats (public)
export async function GET() {
  try {
    const topDonors = donationDb.getTopDonors(20);
    const stats = donationDb.getStats();

    // Mask emails for privacy (show only first 3 chars + domain)
    const maskedDonors = topDonors.map(d => ({
      ...d,
      email: maskEmail(d.email)
    }));

    return NextResponse.json({
      success: true,
      data: {
        top_donors: maskedDonors,
        stats
      }
    });

  } catch (error) {
    console.error('Get donors error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi khi lấy danh sách donors' },
      { status: 500 }
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  
  const visiblePart = local.slice(0, 3);
  const maskedPart = '*'.repeat(Math.max(local.length - 3, 0));
  return `${visiblePart}${maskedPart}@${domain}`;
}
