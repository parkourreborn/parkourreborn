import { DocumentReference, Timestamp } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { verifyBearer } from '@/lib/server/auth';
import { getAdminAuth, getAdminDb } from '@/lib/server/firebase-admin';
import { checkMemoryLimit } from '@/lib/server/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Firestore values that JSON cannot carry are turned into plain strings.
function plain(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate().toISOString();
  if (value instanceof DocumentReference) return value.path;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(plain);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, plain(item)]));
  }
  return value;
}

// A copy of the personal data stored for the signed-in account (GDPR access
// and portability): the account record, sign-in metadata, the game save and
// time trial stats.
export async function GET(request: NextRequest) {
  let account;
  try {
    account = await verifyBearer(request.headers.get('authorization'));
  } catch {
    return NextResponse.json({ error: 'Log in again.' }, { status: 401 });
  }

  const limited = checkMemoryLimit(`account-export:${account.token.uid}`, [{ seconds: 60, max: 3 }]);
  if (!limited.ok) return NextResponse.json({ error: 'Try again in a minute.' }, { status: 429 });

  try {
    const db = getAdminDb();
    const [user, save, stats, profile] = await Promise.all([
      getAdminAuth().getUser(account.token.uid),
      db.collection('saves').doc(account.discordId).get(),
      db.collection('trialStats').where('discordId', '==', account.discordId).get(),
      account.ref.get(),
    ]);

    const data = {
      exportedAt: new Date().toISOString(),
      service: 'Parkour Reborn Hub (https://www.parkourreborn.com)',
      account: {
        uid: user.uid,
        createdAt: user.metadata.creationTime ?? null,
        lastLogin: user.metadata.lastSignInTime ?? null,
        authDisplayName: user.displayName ?? null,
        authPhotoUrl: user.photoURL ?? null,
        profile: plain(profile.data() ?? null),
      },
      gameSave: save.exists ? plain(save.data()) : null,
      timeTrialStats: stats.docs.map((doc) => ({ id: doc.id, ...(plain(doc.data()) as Record<string, unknown>) })),
    };

    return new NextResponse(JSON.stringify(data, null, 2), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-disposition': 'attachment; filename="parkour-reborn-hub-data.json"',
        'cache-control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Could not export your data. Try again.' }, { status: 500 });
  }
}
