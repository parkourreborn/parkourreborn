import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/server/firebase-admin';
import { verifyBearer } from '@/lib/server/auth';

const stamp = (value: string | undefined) => {
  const time = value ? Date.parse(value) : NaN;
  return Number.isFinite(time) ? new Date(time).toISOString() : null;
};

export async function GET(request: NextRequest) {
  try {
    const { token, data } = await verifyBearer(request.headers.get('authorization'));
    const user = await getAdminAuth().getUser(token.uid);

    return NextResponse.json({
      discord: data.discord,
      account: {
        createdAt: stamp(user?.metadata.creationTime),
        lastLogin: stamp(user?.metadata.lastSignInTime),
        displayName: data.displayName ?? null,
        nameChangedAt: data.nameChangedAt ?? null,
      },
    }, { headers: { 'cache-control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
