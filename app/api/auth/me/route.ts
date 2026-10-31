import { NextResponse } from 'next/server';
import { removeAuthSession, getCurrentUser } from '@/lib/auth';

export async function POST() {
  await removeAuthSession();
  return NextResponse.json({ success: true });
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null });
  }
  return NextResponse.json({ authenticated: true, user });
}

