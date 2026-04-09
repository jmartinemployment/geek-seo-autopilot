import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from './lib/secrets';

const PROTECTED_API = ['/api/sites', '/api/seo', '/api/brand'];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('auth_token')?.value;
  const { pathname } = req.nextUrl;
  const isApi = PROTECTED_API.some((p) => pathname.startsWith(p));

  if (!token) {
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/sign-in', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'geek-auth-service', // must match token.service.ts issuer claim
      algorithms: ['HS256'],
    });

    // Forward verified user ID to API route handlers via header
    const response = NextResponse.next();
    response.headers.set('x-user-id', payload.userId as string);
    response.headers.set('x-user-email', payload.email as string);
    return response;

  } catch {
    return isApi
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/sign-in', req.url));
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/sites/:path*', '/api/seo/:path*', '/api/brand/:path*'],
};
