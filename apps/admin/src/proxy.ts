import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const hasToken = request.cookies.has('access_token');

  // If no session and trying to access admin routes, redirect to login.
  // Exclude /api/* — those paths are rewritten to Railway via next.config
  // and must never be redirected to /login (which made the login POST
  // itself follow a redirect into the /login page route, returning 405).
  if (
    !hasToken &&
    !request.nextUrl.pathname.startsWith('/login') &&
    !request.nextUrl.pathname.startsWith('/_next') &&
    !request.nextUrl.pathname.startsWith('/api/')
  ) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If logged in and on login page, redirect to dashboard
  if (hasToken && request.nextUrl.pathname.startsWith('/login')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
