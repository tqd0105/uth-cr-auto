import { NextRequest, NextResponse } from 'next/server';
import { initDatabase } from '@/lib/db-postgres';

// Initialize database tables (call once on first deploy)
export async function POST(request: NextRequest) {
  try {
    // Simple auth check - you can add a secret token check here
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INIT_DB_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    await initDatabase();

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully'
    });

  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Initialization failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to initialize database'
  });
}
