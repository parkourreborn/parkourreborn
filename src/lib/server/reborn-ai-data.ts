import 'server-only';

import type { CommunityResource, CommunityResourceType } from '@/lib/pages/search';
import type { MovementEntry, MovementKind } from '@/lib/pages/techlist';
import type { TimeTrial, WorldRecord } from '@/lib/pages/timetrials';
import { limits } from '@/lib/reborn-ai/limits';
import { getCollectionDocuments } from '@/lib/server/firebase';
import { getAdminDb } from '@/lib/server/firebase-admin';
import { cleanUrl } from '@/lib/url';

type Loaded<T> = { data: T; checkedAt: string };
type CacheEntry = { at: number; value: Promise<Loaded<unknown>> };

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

const cache = new Map<string, CacheEntry>();
const movementKinds = new Set<MovementKind>(['tech', 'concept', 'basic']);
const resourceOrder = { gif: 0, file: 1, link: 2 } satisfies Record<CommunityResourceType, number>;
const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim());
const list = (value: unknown) => (Array.isArray(value) ? value.map(text).filter(Boolean) : []);

function cached<T>(key: string, load: () => Promise<T>): Promise<Loaded<T>> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < limits.dataCacheMs) return hit.value as Promise<Loaded<T>>;

  const value = load()
    .then((data) => ({ data, checkedAt: new Date().toISOString() }))
    .catch((error) => {
      if (cache.get(key)?.value === value) cache.delete(key);
      throw error;
    });
  cache.set(key, { at: Date.now(), value: value as Promise<Loaded<unknown>> });
  return value;
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
    const docs = await getCollectionDocuments<TrialData>('timetrials');
    return docs
      .filter((doc) => doc.data.active !== false)
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

export function loadWorldRecords() {
  return cached('records', async () => {
    const response = await fetch('https://wasans.tully.sh/v2/records/world', {
      cache: 'no-store',
      signal: AbortSignal.timeout(limits.toolTimeoutMs),
    });
    if (!response.ok) throw new Error(`world records responded ${response.status}`);
    const raw = await response.json() as WrResponse;
    const records = (raw.data ?? [])
      .filter((item): item is WrItem & { trial_name: string; time: number } => Boolean(item.trial_name) && typeof item.time === 'number')
      .map<WorldRecord>((item) => ({
        trialName: item.trial_name,
        playerName: item.player_name ?? 'Unknown',
        time: item.time,
        submissionUuid: item.submission_uuid ?? '',
        playerScore: typeof item.player_score === 'number' ? item.player_score : null,
      }));
    return { raw, records };
  });
}
