import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Admin credentials từ environment variables
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Session duration: 24 hours
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Generate secure session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// POST - Admin login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // Validate credentials
    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: 'Cấu hình không hợp lệ' },
        { status: 500 }
      );
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: 'Thông tin đăng nhập không đúng' },
        { status: 401 }
      );
    }

    // Get client info
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Generate session token
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION);

    // Save session to database
    await sql`
      INSERT INTO admin_sessions (session_token, ip_address, user_agent, expires_at)
      VALUES (${sessionToken}, ${ipAddress}, ${userAgent}, ${expiresAt.toISOString()})
    `;

    // Clean up old sessions
    await sql`DELETE FROM admin_sessions WHERE expires_at < CURRENT_TIMESTAMP`;

    // Set httpOnly cookie
    const response = NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công'
    });

    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: expiresAt,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}

// GET - Check admin session
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (!sessionToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Check session in database
    const result = await sql`
      SELECT * FROM admin_sessions 
      WHERE session_token = ${sessionToken} 
      AND expires_at > CURRENT_TIMESTAMP
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error('Admin session check error:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

// DELETE - Admin logout
export async function DELETE(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (sessionToken) {
      // Delete session from database
      await sql`DELETE FROM admin_sessions WHERE session_token = ${sessionToken}`;
    }

    const response = NextResponse.json({ success: true, message: 'Đã đăng xuất' });
    
    response.cookies.set('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      expires: new Date(0),
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Admin logout error:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
