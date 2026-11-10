export type MovementKind = 'tech' | 'concept' | 'basic';

export type MovementEntry = {
  name: string;
  kind: MovementKind;
  aliases: string[];
  steps: string[];
  videoUrl: string;
  tutorialUrl: string;
};

export type TechFilter = 'all' | MovementKind;

export type SearchResult = {
  entry: MovementEntry;
  matchedAlias: string;
  score: number;
};

export type ParsedStep = {
  label: string;
  optional: boolean;
  add: boolean;
  remove: boolean;
};

export type PreviewKind = 'video' | 'image' | 'none';

export const kindLabels = {
  tech: 'Tech',
  concept: 'Concept',
  basic: 'Basic',
} satisfies Record<MovementKind, string>;

export const filterLabels = {
  all: 'All',
  tech: 'Techs',
  concept: 'Concepts',
  basic: 'Basics',
} satisfies Record<TechFilter, string>;

const videoExt = new Set(['mp4', 'webm', 'mov']);
const imageExt = new Set(['gif', 'png', 'jpg', 'jpeg', 'webp']);
const key = (value: string) => value.trim().toLowerCase();
const flatKey = (value: string) => key(value).replace(/\s+/g, '');

type SearchKey = {
  text: string;
  flat: string;
};

function ext(url: string) {
  const clean = url.split('?')[0].split('#')[0];
  return clean.includes('.') ? clean.split('.').pop()?.toLowerCase() ?? '' : '';
}

function kindText(entry: MovementEntry) {
  return `${entry.kind} ${kindLabels[entry.kind]} ${filterLabels[entry.kind]}`;
}

function hits(value: string, search: SearchKey) {
  const text = key(value);
  return text.includes(search.text) || Boolean(search.flat && flatKey(value).includes(search.flat));
}

function aliasMatch(entry: MovementEntry, search: SearchKey) {
  return entry.aliases.find((alias) => hits(alias, search)) ?? '';
}

function stepMatch(entry: MovementEntry, search: SearchKey) {
  return entry.steps.some((step) => hits(parseStep(step).label, search));
}

function rankEntry(entry: MovementEntry, search: SearchKey): SearchResult | null {
  if (!search.text) return {entry, matchedAlias: '', score: 100};

  const name = key(entry.name);
  const nameFlat = flatKey(entry.name);
  const aliases = entry.aliases.map((alias) => ({ text: key(alias), flat: flatKey(alias) }));
  const steps = stepMatch(entry, search);
  const kind = hits(kindText(entry), search);
  const alias = aliasMatch(entry, search);
  const onlyAlias = Boolean(alias && !hits(entry.name, search) && !steps && !kind);
  const base = {entry, matchedAlias: onlyAlias ? alias : '', score: 0};

  if (name === search.text || nameFlat === search.flat) return {...base, score: 0};
  if (name.startsWith(search.text) || nameFlat.startsWith(search.flat)) return {...base, score: 1};
  if (aliases.some((item) => item.text === search.text || item.flat === search.flat)) return {...base, score: 2};
  if (aliases.some((item) => item.text.startsWith(search.text) || item.flat.startsWith(search.flat))) return {...base, score: 3};
  if (steps) return {...base, score: 4};
  if (hits(entry.name, search) || kind || alias) return {...base, score: 5};

  return null;
}

export async function fetchTechs(): Promise<MovementEntry[]> {
  const response = await fetch('/api/techs');
  if (!response.ok) throw new Error('Tech list API failed');

  const data = await response.json() as MovementEntry[];
  return Array.isArray(data) ? data : [];
}

export function parseStep(step: string): ParsedStep {
  const label = step.trim();
  const marker = label.match(/[*+-]\s*$/)?.[0].trim() ?? '';

  return {
    label: marker ? label.replace(/[*+-]\s*$/, '').trim() : label,
    optional: marker === '*',
    add: marker === '+',
    remove: marker === '-',
  };
}

export function searchTechs(entries: MovementEntry[], query: string, filter: TechFilter): SearchResult[] {
  const search = {
    text: key(query),
    flat: flatKey(query),
  };

  return entries
    .filter((entry) => filter === 'all' || entry.kind === filter)
    .map((entry) => rankEntry(entry, search))
    .filter((result): result is SearchResult => Boolean(result))
    .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name));
}

export function findStepEntry(entries: MovementEntry[], step: string): MovementEntry | null {
  const search = key(parseStep(step).label);
  if (!search) return null;

  return entries.find((entry) => key(entry.name) === search || entry.aliases.some((alias) => key(alias) === search)) ?? null;
}

export function previewKind(url: string): PreviewKind {
  const type = ext(url);
  if (videoExt.has(type)) return 'video';
  if (imageExt.has(type)) return 'image';
  return 'none';
}

export function youtubeEmbedUrl(url: string) {
  const raw = url.trim();
  if (!raw) return '';

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    const parts = parsed.pathname.split('/').filter(Boolean);
    let id = '';

    if (host === 'youtu.be') id = parts[0] ?? '';

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      if (parts[0] === 'watch') id = parsed.searchParams.get('v') ?? '';
      if (parts[0] === 'shorts' || parts[0] === 'embed') id = parts[1] ?? '';
    }

    id = id.split('?')[0].split('&')[0].trim();
    // youtube-nocookie.com: YouTube's privacy-enhanced mode, which does not set
    // tracking cookies until the visitor plays the video.
    return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
  } catch {
    return '';
  }
}
