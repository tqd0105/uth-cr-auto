import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Verify admin session from cookie
export async function verifyAdminSession(request: NextRequest): Promise<boolean> {
  try {
    const sessionToken = request.cookies.get('admin_session')?.value;

    if (!sessionToken) {
      return false;
    }

    const result = await sql`
      SELECT * FROM admin_sessions 
      WHERE session_token = ${sessionToken} 
      AND expires_at > CURRENT_TIMESTAMP
    `;

    return result.rows.length > 0;
  } catch (error) {
    console.error('Admin session verify error:', error);
    return false;
  }
}

// Middleware wrapper for admin API routes
export function withAdminAuth(
  handler: (request: NextRequest) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const isAuthenticated = await verifyAdminSession(request);

    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    return handler(request);
  };
}
