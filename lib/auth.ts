import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { JWT_SECRET } from './secrets';

export async function auth() {
  const token = (await cookies()).get('auth_token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      issuer: 'geek-auth-service',
      algorithms: ['HS256'],
    });
    return {
      user: {
        id: payload.userId as string,
        email: payload.email as string,
        name: (payload.name as string | null) ?? null,
        plan: payload.plan as string,
        roles: (payload.roles as string[]) ?? [],
        permissions: (payload.permissions as string[]) ?? [],
      },
    };
  } catch { return null; }
}

// Permission check helper
export function can(session: Awaited<ReturnType<typeof auth>>, permission: string) {
  return session?.user.permissions.includes(permission) ?? false;
}
