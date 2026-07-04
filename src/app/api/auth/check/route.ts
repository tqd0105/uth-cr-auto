import { NextRequest, NextResponse } from 'next/server';
import { userConfigDb } from '@/lib/db-postgres';

// GET - Check if user is logged in
export async function GET(request: NextRequest) {
  try {
    const userSession = request.cookies.get('user-session')?.value;

    if (!userSession) {
      return NextResponse.json({ authenticated: false });
    }

    // Verify session exists in database
    const userConfig = await userConfigDb.findBySession(userSession);
    
    if (!userConfig) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({ 
      authenticated: true,
      userSession 
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
