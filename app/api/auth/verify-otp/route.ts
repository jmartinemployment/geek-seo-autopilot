import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3000';

const schema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
  biosId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp, biosId } = schema.parse(body);

    const response = await fetch(`${AUTH_SERVICE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'urn:geek:otp',
        email,
        otp,
        bios_id: biosId,
        client_id: 'geek-seo-autopilot',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(error, { status: response.status });
    }

    const { access_token, refresh_token } = await response.json();

    // Set httpOnly cookies
    const cookieStore = await cookies();
    cookieStore.set('auth_token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60, // 15 minutes
    });

    cookieStore.set('refresh_token', refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error as any;
    return NextResponse.json(
      { error: err.message || 'Failed to verify OTP' },
      { status: 400 }
    );
  }
}
