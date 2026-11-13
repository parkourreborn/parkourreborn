import 'server-only';

import type { CommunityResource, CommunityResourceType } from '@/lib/pages/search';
import type { MovementEntry, MovementKind } from '@/lib/pages/techlist';
import type { TimeTrial, WorldRecord } from '@/lib/pages/timetrials';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { swrCache } from '@/lib/server/swr';
import { worldRecordsRaw } from '@/lib/server/wasans';
import { cleanUrl } from '@/lib/url';

type Loaded<T> = { data: T; checkedAt: string };

type MovementData = {
  Aliases?: unknown;
  Kind?: unknown;
  Steps?: unknown;
  VideoUrl?: unknown;
  TutorialUrl?: unknown;
  active?: unknown;
};

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

type GifData = { link?: string; redirect?: string; active?: unknown };
type LinkData = { link?: string; description?: string; active?: unknown };
type FileData = { link?: string; description?: string; downloadable?: boolean; active?: unknown };

export type WrItem = {
  trial_name?: string;
  player_name?: string;
  time?: number;
  submission_uuid?: string;
  player_score?: number;
};

export type WrResponse = { data?: WrItem[] };

// Firestore lists change rarely: serve them from memory for 5 minutes, and
// keep serving the last good copy (while refreshing) for up to a day.
const cache = swrCache<unknown>({ freshMs: 5 * 60_000, maxStaleMs: 24 * 60 * 60_000, maxEntries: 20 });
const movementKinds = new Set<MovementKind>(['tech', 'concept', 'basic']);
const resourceOrder = { gif: 0, file: 1, link: 2 } satisfies Record<CommunityResourceType, number>;
const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim());
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);

async function cached<T>(key: string, load: () => Promise<T>): Promise<Loaded<T>> {
  const { value, at } = await cache.get(key, load);
  return { data: value as T, checkedAt: new Date(at).toISOString() };
}

function cleanMovement(id: string, data: MovementData): MovementEntry {
  const kind = text(data.Kind).toLowerCase() as MovementKind;
  return {
    name: id,
    kind: movementKinds.has(kind) ? kind : 'tech',
    aliases: list(data.Aliases),
    steps: list(data.Steps),
    videoUrl: cleanUrl(data.VideoUrl),
    tutorialUrl: cleanUrl(data.TutorialUrl),
  };
}

export function loadTechs() {
  return cached('techs', async () => {
    const snapshot = await getAdminDb().collection('movement').get();
    return snapshot.docs
      .filter((doc) => doc.data().active !== false)
      .map((doc) => cleanMovement(doc.id, doc.data() as MovementData))
      .sort((a, b) => a.name.localeCompare(b.name));
  });
}

export function loadTimeTrials() {
  return cached('trials', async () => {
    const docs = await activeDocs<TrialData>('timetrials');
    return docs
      .map<TimeTrial>((doc) => ({
        name: doc.id,
        bronzeTime: text(doc.data.bronzeTime),
        silverTime: text(doc.data.silverTime),
        goldTime: text(doc.data.goldTime),
        platinumTime: text(doc.data.platinumTime),
        videoURL: cleanUrl(doc.data.videoURL),
        videoURL2: cleanUrl(doc.data.videoURL2),
        difficulty: text(doc.data.difficulty) || 'Unknown',
        district: text(doc.data.district) || 'Unknown',
        sorting: Number.isFinite(Number(doc.data.sorting)) ? Number(doc.data.sorting) : 9999,
      }))
      .sort((a, b) => a.sorting - b.sorting || a.name.localeCompare(b.name));
  });
}

async function activeDocs<T>(name: string) {
  const snapshot = await getAdminDb().collection(name).get();
  return snapshot.docs
    .map((doc) => ({ id: doc.id, data: doc.data() as T & { active?: unknown } }))
    .filter((doc) => doc.data.active !== false);
}

function cleanResource(id: string, type: CommunityResourceType, data: GifData | LinkData | FileData): CommunityResource | null {
  const link = cleanUrl(data.link);
  if (!id || !link) return null;
  const resource: CommunityResource = { id: `${type}:${id}`, name: id, type, link };
  if (type === 'gif' && 'redirect' in data) {
    const redirect = cleanUrl(data.redirect);
    if (redirect) resource.redirect = redirect;
  }
  if ('description' in data && text(data.description)) resource.description = text(data.description);
  if (type === 'file' && 'downloadable' in data) resource.downloadable = data.downloadable === true;
  return resource;
}

export function loadCommunityResources() {
  return cached('community', async () => {
    const [gifs, files, links] = await Promise.all([
      activeDocs<GifData>('gifs'),
      activeDocs<FileData>('files'),
      activeDocs<LinkData>('links'),
    ]);
    return [
      ...gifs.map((doc) => cleanResource(doc.id, 'gif', doc.data)),
      ...files.map((doc) => cleanResource(doc.id, 'file', doc.data)),
      ...links.map((doc) => cleanResource(doc.id, 'link', doc.data)),
    ]
      .filter((item): item is CommunityResource => Boolean(item))
      .sort((a, b) => resourceOrder[a.type] - resourceOrder[b.type] || a.name.localeCompare(b.name));
  });
}

// Shares the Wasans client's cache with Reborn AI (see server/wasans.ts).
export async function loadWorldRecords() {
  const { raw, checkedAt } = await worldRecordsRaw();
  const records = ((raw as WrResponse).data ?? [])
    .filter((item): item is WrItem & { trial_name: string; time: number } => Boolean(item.trial_name) && typeof item.time === 'number')
    .map<WorldRecord>((item) => ({
      trialName: item.trial_name,
      playerName: item.player_name ?? 'Unknown',
      time: item.time,
      submissionUuid: item.submission_uuid ?? '',
      playerScore: typeof item.player_score === 'number' ? item.player_score : null,
    }));
  return { data: { raw: raw as WrResponse, records }, checkedAt };
}
