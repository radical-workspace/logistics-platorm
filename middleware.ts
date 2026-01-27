import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_FILE = /\.(.*)$/;

const getProjectRef = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return '';
  try {
    return new URL(url).host.split('.')[0];
  } catch {
    return '';
  }
};

const hasSupabaseAuthCookie = (request: NextRequest) => {
  const projectRef = getProjectRef();
  const cookieNames = [
    projectRef ? `sb-${projectRef}-auth-token` : null,
    'sb-access-token',
    projectRef ? `sb-${projectRef}-access-token` : null,
  ].filter(Boolean) as string[];

  return cookieNames.some((name) => request.cookies.get(name));
};

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml' ||
    pathname === '/sitemap.xml.gz' ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard/auth')) {
    const headers = new Headers(request.headers);
    headers.set('x-dashboard-auth', '1');
    return NextResponse.next({ request: { headers } });
  }

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next();
  }

  if (hasSupabaseAuthCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/dashboard/auth/login';
  loginUrl.searchParams.set('next', `${pathname}${search}`);

  return NextResponse.redirect(loginUrl, 307);
}

export const config = {
  matcher: '/:path*',
};
