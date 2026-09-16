import { NextResponse } from 'next/server';
import type { TimeTrial } from '@/lib/pages/timetrials';
import { getCollectionDocuments } from '@/lib/server/firebase';
import { cleanUrl } from '@/lib/url';

type TrialData = {
  bronzeTime?: string | number;
  silverTime?: string | number;
  goldTime?: string | number;
  platinumTime?: string | number;
  videoURL?: string;
  videoURL2?: string;
  difficulty?: string;
  district?: string;
  sorting?: string | number;
  active?: unknown;
};

export const dynamic = 'force-dynamic';

const text = (value: unknown) => (value === undefined || value === null ? '' : String(value));

const sortNum = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 9999;
};

function cleanTrial(id: string, data: TrialData): TimeTrial {
  return {
    name: id,
    bronzeTime: text(data.bronzeTime),
    silverTime: text(data.silverTime),
    goldTime: text(data.goldTime),
    platinumTime: text(data.platinumTime),
    videoURL: cleanUrl(data.videoURL),
    videoURL2: cleanUrl(data.videoURL2),
    difficulty: text(data.difficulty) || 'Unknown',
    district: text(data.district) || 'Unknown',
    sorting: sortNum(data.sorting),
  };
}

export async function GET() {
  try {
    const docs = await getCollectionDocuments<TrialData>('timetrials');
    const trials = docs
      .filter((doc) => doc.data.active !== false)
      .map((doc) => cleanTrial(doc.id, doc.data))
      .sort((a, b) => a.sorting - b.sorting || a.name.localeCompare(b.name));

    return NextResponse.json(trials);
  } catch {
    return NextResponse.json({ error: 'Time trials unavailable' }, { status: 500 });
  }
}
