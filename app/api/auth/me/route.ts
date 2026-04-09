import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(session.user);
  } catch (error) {
    const err = error as any;
    return NextResponse.json(
      { error: err.message || 'Failed to get user info' },
      { status: 400 }
    );
  }
}
