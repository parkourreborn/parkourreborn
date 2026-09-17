import { randomBytes } from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { finishAccountDeletion } from '@/lib/server/account-delete';
import { getAdminAuth, getAdminDb } from '@/lib/server/firebase-admin';

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
  discriminator?: string | null;
};

const maxAge = 5 * 60;
const discordUid = (id: string) => `discord-${id}`;

const home = (request: NextRequest, status: string) => {
  const url = new URL('/', request.url);
  url.searchParams.set('discord', status);
  return url;
};

const env = () => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error('Discord env is missing');
  return { clientId, clientSecret, redirectUri };
};

async function exchangeCode(code: string) {
  const { clientId, clientSecret, redirectUri } = env();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const response = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) throw new Error('Discord token exchange failed');
  return response.json() as Promise<{ access_token: string }>;
}

async function getDiscordUser(accessToken: string) {
  const response = await fetch('https://discord.com/api/users/@me', {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) throw new Error('Discord user fetch failed');
  return response.json() as Promise<DiscordUser>;
}

async function syncAuthUser(uid: string, user: DiscordUser) {
  const displayName = user.global_name || user.username;
  const photoURL = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : undefined;
  const data = photoURL ? { displayName, photoURL } : { displayName };

  try {
    await getAdminAuth().updateUser(uid, data);
  } catch {
    await getAdminAuth().createUser({ uid, ...data });
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const cookieState = request.cookies.get('discord_oauth_state')?.value;

  if (!code || !state || state !== cookieState) return NextResponse.redirect(home(request, 'error'));

  const db = getAdminDb();
  const stateRef = db.collection('discordAuthStates').doc(state);
  const stateDoc = await stateRef.get();
  const stateData = stateDoc.data() as { expiresAt?: number } | undefined;

  if (!stateDoc.exists || !stateData?.expiresAt || stateData.expiresAt < Date.now()) {
    await stateRef.delete().catch(() => {});
    return NextResponse.redirect(home(request, 'expired'));
  }

  try {
    const token = await exchangeCode(code);
    const user = await getDiscordUser(token.access_token);
    const linkedAt = new Date().toISOString();
    const uid = discordUid(user.id);
    const login = randomBytes(32).toString('hex');
    const now = Date.now();
    const profile = {
      id: user.id,
      username: user.username,
      globalName: user.global_name ?? null,
      avatar: user.avatar ?? null,
      discriminator: user.discriminator ?? null,
      email: null,
      linkedAt,
    };
    const account = await db.collection('users').doc(uid).get();
    const status = account.data()?.status;

    if (status === 'deleting') {
      await finishAccountDeletion(uid, user.id);
      await stateRef.delete();
      const response = NextResponse.redirect(home(request, 'deleted'));
      response.cookies.delete('discord_oauth_state');
      return response;
    }

    let reactivate = status === 'deactivated';
    if (!reactivate && account.exists) {
      try {
        reactivate = (await getAdminAuth().getUser(uid)).disabled;
      } catch (error) {
        if (!(error instanceof Error && 'code' in error && error.code === 'auth/user-not-found')) throw error;
      }
    }

    if (!reactivate) {
      await syncAuthUser(uid, user);
      await db.collection('users').doc(uid).set({ discord: profile, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }

    await db.collection('discordLogins').doc(login).set({
      uid,
      discordId: user.id,
      ...(reactivate ? { reactivate: true, discord: profile } : {}),
      createdAt: now,
      expiresAt: now + maxAge * 1000,
    });

    await stateRef.delete();

    const response = NextResponse.redirect(home(request, reactivate ? 'reactivate' : 'linked'));
    response.cookies.delete('discord_oauth_state');
    response.cookies.set('discord_login', login, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge,
      path: '/',
    });
    return response;
  } catch {
    await stateRef.delete().catch(() => {});
    const response = NextResponse.redirect(home(request, 'error'));
    response.cookies.delete('discord_oauth_state');
    return response;
  }
}
