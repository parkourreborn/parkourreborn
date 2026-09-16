import { NextResponse } from 'next/server';
import type { MovementEntry, MovementKind } from '@/lib/pages/techlist';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { cleanUrl } from '@/lib/url';

type MovementData = {
  Aliases?: unknown;
  Kind?: unknown;
  Steps?: unknown;
  VideoUrl?: unknown;
  TutorialUrl?: unknown;
  active?: unknown;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const kinds = new Set<MovementKind>(['tech', 'concept', 'basic']);
const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim());
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);

function cleanKind(value: unknown): MovementKind {
  const kind = text(value).toLowerCase() as MovementKind;
  return kinds.has(kind) ? kind : 'tech';
}

function cleanEntry(id: string, data: MovementData): MovementEntry {
  return {
    name: id,
    kind: cleanKind(data.Kind),
    aliases: list(data.Aliases),
    steps: list(data.Steps),
    videoUrl: cleanUrl(data.VideoUrl),
    tutorialUrl: cleanUrl(data.TutorialUrl),
  };
}

export async function GET() {
  try {
    const snapshot = await getAdminDb().collection('movement').get();
    const techs = snapshot.docs
      .filter((doc) => doc.data().active !== false)
      .map((doc) => cleanEntry(doc.id, doc.data() as MovementData))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(techs);
  } catch {
    return NextResponse.json({ error: 'Tech list unavailable' }, { status: 500 });
  }
}
