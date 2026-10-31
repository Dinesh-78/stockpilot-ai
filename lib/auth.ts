import { cookies } from 'next/headers';
import { prisma } from './prisma';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'OWNER' | 'STAFF';
  businessId: string;
  businessName: string;
}

const COOKIE_NAME = 'stockpilot_session';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionVal = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionVal) return null;

  try {
    const parsed = JSON.parse(Buffer.from(sessionVal, 'base64').toString('utf-8'));
    // Verify user still exists in database
    const user = await prisma.user.findUnique({
      where: { id: parsed.id },
      include: { business: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'OWNER' | 'STAFF',
      businessId: user.businessId,
      businessName: user.business.name,
    };
  } catch {
    return null;
  }
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

export async function setAuthSession(user: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encodeSession(user), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function removeAuthSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

