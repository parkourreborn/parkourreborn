import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/server/firebase-admin';

type Login = {
  uid?: string;
  discordId?: string;
  expiresAt?: number;
  reactivate?: boolean;
  discord?: Record<string, unknown>;
};

const sameOrigin = (request: NextRequest) => request.headers.get('origin') === request.nextUrl.origin;

async function pending(request: NextRequest) {
  const login = request.cookies.get('discord_login')?.value;
  if (!login) return null;

  const db = getAdminDb();
  const ref = db.collection('discordLogins').doc(login);
  const doc = await ref.get();
  const data = doc.data() as Login | undefined;
  if (!doc.exists || !data?.uid || !data.discordId || data.uid !== `discord-${data.discordId}` || !data.expiresAt || data.expiresAt < Date.now()) {
    await ref.delete().catch(() => {});
    return null;
  }

  return { ref, data };
}

const done = (body: Record<string, unknown>) => {
  const response = NextResponse.json(body, { headers: { 'cache-control': 'no-store' } });
  response.cookies.delete('discord_login');
  return response;
};

export async function POST(request: NextRequest) {
  const login = await pending(request);
  if (!login) return done({ token: null });
  if (login.data.reactivate) return NextResponse.json({ token: null, reactivate: true }, { headers: { 'cache-control': 'no-store' } });

  const profile = await getAdminDb().collection('users').doc(login.data.uid!).get();
  if (profile.data()?.status === 'deactivated' || profile.data()?.status === 'deleting' || profile.data()?.discord?.id !== login.data.discordId) {
    await login.ref.delete();
    return done({ token: null });
  }

  const token = await getAdminAuth().createCustomToken(login.data.uid!, {
    provider: 'discord',
    discordId: login.data.discordId,
  });

  await login.ref.delete();
  return done({ token });
}

export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Bad request.' }, { status: 403 });
  const login = await pending(request);
  if (!login?.data.reactivate || !login.data.discord) return done({ token: null });

  const { uid, discordId, discord } = login.data;
  const ref = getAdminDb().collection('users').doc(uid!);

  try {
    await getAdminDb().runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.data();
      if (!data || data.discord?.id !== discordId || (data.status !== 'deactivated' && data.status !== 'active')) throw new Error('ACCOUNT_UNAVAILABLE');
      tx.update(ref, { status: 'active', discord, deactivatedAt: null, updatedAt: new Date() });
    });

    const name = String(discord.globalName || discord.username || '').slice(0, 64);
    const avatar = typeof discord.avatar === 'string' && discord.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discord.avatar}.png?size=128` : undefined;
    await getAdminAuth().updateUser(uid!, { disabled: false, displayName: name, ...(avatar ? { photoURL: avatar } : {}) });
    const token = await getAdminAuth().createCustomToken(uid!, { provider: 'discord', discordId });
    await login.ref.delete();
    return done({ token });
  } catch {
    return NextResponse.json({ error: 'Could not reactivate your account. Try again.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Bad request.' }, { status: 403 });
  const login = await pending(request);
  if (login) await login.ref.delete();
  return done({ token: null });
}
