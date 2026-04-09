import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const authToken = req.cookies.get('auth_token')?.value;

  if (authToken) {
    // Notify auth service to revoke + blacklist
    await fetch(`${process.env.AUTH_SERVICE_URL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    }).catch(() => {}); // best-effort; clear cookies regardless
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.delete('auth_token');
  res.cookies.delete('refresh_token');
  return res;
}
