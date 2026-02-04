import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Các path được phép truy cập khi maintenance mode
const ALLOWED_PATHS = [
  '/maintenance',
  '/admin',
  '/admin/login',
  '/api/admin',
  '/api/init-db',
  '/_next',
  '/favicon.ico',
  '/uth.png',
  '/uth2.png',
];

// Check nếu path được phép
function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATHS.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Bỏ qua các path được phép
  if (isAllowedPath(pathname)) {
    return NextResponse.next();
  }

  // Bỏ qua static files
  if (pathname.includes('.') && !pathname.endsWith('/')) {
    return NextResponse.next();
  }

  try {
    // Check maintenance mode từ API
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/admin/maintenance`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.data.maintenance_mode === true) {
        // Redirect to maintenance page
        const maintenanceUrl = new URL('/maintenance', request.url);
        return NextResponse.redirect(maintenanceUrl);
      }
    }
  } catch (error) {
    // Nếu có lỗi, cho phép truy cập bình thường
    console.error('Middleware maintenance check error:', error);
  }

  return NextResponse.next();
}

// Chỉ apply middleware cho các routes cần thiết
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes) - sẽ được handle riêng trong middleware
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
