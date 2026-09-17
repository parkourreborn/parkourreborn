import { fetchGameSave } from '@/lib/pages/gamesave';

export type StatTile = {
  label: string;
  value: string;
};

export type StatTable = {
  title: string;
  columns: string[];
  rows: string[][];
};

export type GameStats = {
  tiles: StatTile[];
  tables: StatTable[];
};

export type StatSource = {
  id: string;
  name: string;
  load: (token: string) => Promise<GameStats | null>;
};

type Bag = Record<string, unknown>;

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 2 });
const plain = new Intl.NumberFormat('en');

const bag = (value: unknown): Bag => (typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Bag : {});
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);
const best = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null);

export const count = (value: number) => (Math.abs(value) >= 10000 ? compact.format(value) : plain.format(Math.round(value)));

export function playtime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${total % 60}s`;
  return `${total}s`;
}

export function lapTime(seconds: number | null) {
  if (seconds === null) return '--';

  const rounded = Math.round(seconds * 1000) / 1000;
  const minutes = Math.floor(rounded / 60);
  const rest = rounded - minutes * 60;
  return minutes ? `${minutes}:${rest.toFixed(3).padStart(6, '0')}` : rest.toFixed(3);
}

function readSave(json: string): Bag | null {
  try {
    const save = JSON.parse(json) as unknown;
    return typeof save === 'object' && save !== null && !Array.isArray(save) ? save as Bag : null;
  } catch {
    return null;
  }
}

async function loadIncremental(token: string): Promise<GameStats | null> {
  const cloud = await fetchGameSave(token);
  if (!cloud) throw new Error('Stats unavailable');
  if (!cloud.json) return null;

  const save = readSave(cloud.json);
  if (!save) return null;

  const credits = bag(save.credits);
  const trials = (Array.isArray(save.trials) ? save.trials : []).map(bag).filter((trial) => typeof trial.name === 'string' && trial.name);

  return {
    tiles: [
      { label: 'Credits', value: count(num(credits.balance)) },
      { label: 'Lifetime credits', value: count(num(credits.lifetimeEarned)) },
      { label: 'Playtime', value: playtime(num(save.playtimeSeconds)) },
    ],
    tables: trials.length ? [{
      title: 'Time trials',
      columns: ['Trial', 'Best time', 'Credits'],
      rows: trials.map((trial) => [
        String(trial.name),
        lapTime(best(trial.bestTimeSeconds)),
        count(num(trial.creditsEarned)),
      ]),
    }] : [],
  };
}

export const statSources: StatSource[] = [
  { id: 'incrementalparkour', name: 'Incremental Parkour', load: loadIncremental },
];
