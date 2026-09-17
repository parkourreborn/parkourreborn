import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { accountFor, verifyBearer } from '@/lib/server/auth';
import { finishAccountDeletion } from '@/lib/server/account-delete';
import { getAdminAuth, getAdminDb } from '@/lib/server/firebase-admin';
import { sessionCookie } from '@/lib/server/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const hour = 60 * 60 * 1000;

export async function PATCH(request: NextRequest) {
  let account;
  try {
    account = await verifyBearer(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Log in again.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { displayName?: unknown } | null;
  const name = typeof body?.displayName === 'string' ? body.displayName.trim().replace(/\s+/g, ' ') : '';
  if (!name || name.length > 32 || /[\x00-\x1f\x7f]/.test(name)) {
    return NextResponse.json({ error: 'Use 1–32 characters for your display name.' }, { status: 400 });
  }

  const now = Date.now();
  const { ref, discordId } = account;
  const saveRef = getAdminDb().collection('saves').doc(discordId);

  try {
    const result = await getAdminDb().runTransaction(async (tx) => {
      const [profile, save] = await Promise.all([tx.get(ref), tx.get(saveRef)]);
      const data = profile.data();
      if (!data || data.discord?.id !== discordId || data.status === 'deactivated' || data.status === 'deleting') throw new Error('ACCOUNT_UNAVAILABLE');
      if (data.displayName === name) return { name, nameChangedAt: data.nameChangedAt ?? null };
      const changedAt = Number(data.nameChangedAt || 0);
      if (changedAt && now - changedAt < hour) throw new Error('RATE_LIMIT');

      tx.update(ref, { displayName: name, nameChangedAt: now, updatedAt: FieldValue.serverTimestamp() });
      if (save.exists) tx.update(saveRef, { discordName: name });
      return { name, nameChangedAt: now };
    });

    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'RATE_LIMIT') {
      return NextResponse.json({ error: 'You can change your name once an hour.' }, { status: 429 });
    }
    if (error instanceof Error && error.message === 'ACCOUNT_UNAVAILABLE') return NextResponse.json({ error: 'Log in again.' }, { status: 401 });
    return NextResponse.json({ error: 'Could not update your name.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let account;
  try {
    account = await verifyBearer(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Log in again.' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { action?: unknown } | null;
  if (body?.action !== 'deactivate') return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  try {
    await getAdminDb().runTransaction(async (tx) => {
      const profile = await tx.get(account.ref);
      const data = profile.data();
      if (!data || data.discord?.id !== account.discordId || data.status === 'deactivated' || data.status === 'deleting') throw new Error('ACCOUNT_UNAVAILABLE');
      tx.update(account.ref, { status: 'deactivated', deactivatedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    });
    await getAdminAuth().updateUser(account.token.uid, { disabled: true });

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(sessionCookie);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'ACCOUNT_UNAVAILABLE') return NextResponse.json({ error: 'Log in again.' }, { status: 401 });
    return NextResponse.json({ error: 'Could not finish deactivation. Try logging in again.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json().catch(() => null) as { confirm?: unknown } | null;
  if (body?.confirm !== 'DELETE') return NextResponse.json({ error: 'Type DELETE to confirm.' }, { status: 400 });

  let account;
  try {
    const [type, key] = request.headers.get('authorization')?.split(' ') ?? [];
    if (type !== 'Bearer' || !key) throw new Error('Missing auth token');
    const token = await getAdminAuth().verifyIdToken(key);
    const profile = await accountFor(token);
    if (profile.data.status === 'deactivated') throw new Error('Account deactivated');
    if (profile.data.status !== 'deleting') {
      await getAdminAuth().verifyIdToken(key, true);
      if (Date.now() / 1000 - token.auth_time > 15 * 60) {
        return NextResponse.json({ error: 'Log out and back in before deleting your account.' }, { status: 403 });
      }
    }
    account = { token, ...profile };
  } catch {
    return NextResponse.json({ error: 'Log in again.' }, { status: 401 });
  }

  try {
    await getAdminDb().runTransaction(async (tx) => {
      const doc = await tx.get(account.ref);
      const data = doc.data();
      if (!data || data.discord?.id !== account.discordId || data.status === 'deactivated') throw new Error('ACCOUNT_UNAVAILABLE');
      if (data.status !== 'deleting') tx.update(account.ref, { status: 'deleting', updatedAt: FieldValue.serverTimestamp() });
    });
    await finishAccountDeletion(account.token.uid, account.discordId);

    const response = NextResponse.json({ ok: true });
    response.cookies.delete(sessionCookie);
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'ACCOUNT_UNAVAILABLE') return NextResponse.json({ error: 'Log in again.' }, { status: 401 });
    return NextResponse.json({ error: 'Deletion did not finish. Try again.' }, { status: 500 });
  }
}
