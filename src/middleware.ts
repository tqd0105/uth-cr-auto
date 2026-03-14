import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Fake Vercel 404 page - giống y hệt khi domain không tồn tại trên Vercel
const VERCEL_404_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>404: This page could not be found</title>
<style>
body{color:#000;background:#fff;margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif}
.container{display:flex;align-items:center;justify-content:center;min-height:100vh}
.inner{text-align:center}
h1{display:inline-block;border-right:1px solid rgba(0,0,0,.3);margin-right:20px;padding:10px 23px 10px 0;font-size:24px;font-weight:500;vertical-align:top}
.message{display:inline-block;text-align:left;line-height:49px;height:49px;vertical-align:middle}
p{font-size:14px;font-weight:400;margin:0;padding:0}
@media(prefers-color-scheme:dark){body{color:#fff;background:#000}h1{border-right-color:rgba(255,255,255,.3)}}
</style>
</head>
<body>
<div class="container">
<div class="inner">
<h1>404</h1>
<div class="message"><p>This page could not be found.</p></div>
</div>
</div>
</body>
</html>`;

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

// Paths chỉ admin được truy cập khi site hidden (strict hơn maintenance)
const ADMIN_ONLY_PATHS = [
  '/admin',
  '/admin/login',
  '/api/admin',
  '/api/init-db',
  '/_next',
  '/favicon.ico',
];

// Check nếu path được phép
function isAllowedPath(pathname: string, paths: string[]): boolean {
  return paths.some(path => pathname.startsWith(path));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Luôn cho phép admin paths
  if (isAllowedPath(pathname, ADMIN_ONLY_PATHS)) {
    return NextResponse.next();
  }

  // Bỏ qua static files
  if (pathname.includes('.') && !pathname.endsWith('/')) {
    return NextResponse.next();
  }

  try {
    // Check maintenance mode & site hidden từ API
    const baseUrl = request.nextUrl.origin;
    const res = await fetch(`${baseUrl}/api/admin/maintenance`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        // Site hidden - trả về fake 404 giống Vercel
        if (data.data.site_hidden === true) {
          return new NextResponse(VERCEL_404_HTML, {
            status: 404,
            headers: {
              'Content-Type': 'text/html; charset=utf-8',
              'Cache-Control': 'no-store',
              'X-Robots-Tag': 'noindex',
            },
          });
        }

        // Maintenance mode - redirect to maintenance page
        if (data.data.maintenance_mode === true) {
          if (isAllowedPath(pathname, ALLOWED_PATHS)) {
            return NextResponse.next();
          }
          const maintenanceUrl = new URL('/maintenance', request.url);
          return NextResponse.redirect(maintenanceUrl);
        }
      }
    }
  } catch (error) {
    // Nếu có lỗi, cho phép truy cập bình thường
    console.error('Middleware check error:', error);
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
