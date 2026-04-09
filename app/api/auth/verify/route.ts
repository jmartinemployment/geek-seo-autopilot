import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const response = await fetch(`${process.env.AUTH_SERVICE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'urn:geek:otp',
      client_id: 'geek-seo-autopilot',
      email: body.email,
      otp: body.otp,
      biosId: body.deviceId,
    }),
  });
  const data = await response.json();
  if (!response.ok) return NextResponse.json(data, { status: response.status });

  const res = NextResponse.json({ ok: true });
  res.cookies.set('auth_token', data.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15, // 15 minutes — matches access token lifetime
    path: '/',
  });
  // Store refresh token in separate httpOnly cookie
  res.cookies.set('refresh_token', data.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
  });
  return res;
}
