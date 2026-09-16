import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/server/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getAdminDb().collection('announcements').where('active', '==', true).get();
    const now = Date.now();
    const announcements = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: String(data.title || ''),
          message: String(data.message || ''),
          expiresAt: data.expiresAt?.toMillis?.() ?? null,
          updatedAt: data.updatedAt?.toMillis?.() ?? data.createdAt?.toMillis?.() ?? 0,
        };
      })
      .filter((item) => item.title && item.message && (item.expiresAt === null || item.expiresAt > now))
      .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id))
      .map(({ id, title, message }) => ({ id, title, message }));

    return NextResponse.json({ announcements }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ announcements: [] }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
