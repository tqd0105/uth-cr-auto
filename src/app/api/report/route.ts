import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { sendIssueReportEmail } from '@/lib/services/email-report';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, issueType, description, timestamp, userAgent } = body;

    if (!name || !email || !description) {
      return NextResponse.json(
        { success: false, message: 'Thiếu thông tin bắt buộc' },
        { status: 400 }
      );
    }

    // Save report to database
    await sql`
      INSERT INTO issue_reports (name, email, issue_type, description, timestamp, user_agent, status)
      VALUES (${name}, ${email}, ${issueType}, ${description}, ${timestamp}, ${userAgent || 'unknown'}, 'pending')
    `;

    // Send email notification to admin (don't block response)
    if (process.env.RESEND_API_KEY && process.env.ADMIN_EMAIL) {
      sendIssueReportEmail({
        name,
        email,
        issueType,
        description,
        timestamp,
        userAgent,
      }).then(() => {
        console.log('Email sent successfully to admin');
      }).catch(emailError => {
        console.error('Failed to send email:', emailError);
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Báo cáo đã được gửi thành công. Chúng tôi sẽ xem xét và phản hồi sớm!'
    });
  } catch (error) {
    console.error('Report error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// GET to view reports (admin only - add auth later)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    
    const result = await sql`
      SELECT * FROM issue_reports 
      WHERE status = ${status}
      ORDER BY created_at DESC
      LIMIT 50
    `;
    
    return NextResponse.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
