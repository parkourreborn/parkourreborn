// Pulls the things a question is about out of its text: trials, districts,
// combo categories, players, and numbers like times, scores and levels.
// Pure, so it is tested directly.

import { comboCategories, wasansTrials } from '../wasans-data.ts';
import type { ComboCategory, WasansTrial } from '../wasans-data.ts';

export type Entities = {
  trials: WasansTrial[];
  districts: string[];
  combo: ComboCategory | null;
  players: string[];
  me: boolean;
  times: number[];
  score: number | null;
  levels: number[];
  percent: number | null;
  multiplier: number | null;
  vip: boolean;
  top: number | null;
  range: '7d' | '30d' | '90d' | '1y' | 'all' | null;
};

const lower = (text: string) => text.toLowerCase();
const flat = (text: string) => lower(text).replace(/[^a-z0-9]+/g, '');

// Trial names that are also ordinary words only count when the question is
// clearly about trials ("grip the wall" is not the Grip trial).
const wordTrials = new Set<WasansTrial>(['Crystal', 'Glass', 'Solar', 'Flow', 'Faith', 'Gale', 'Grip', 'Thread', 'Needle', 'Depot', 'Flame', 'Wisp']);
const trialContext = /\b(trials?|tt|wrs?|world records?|records?|pbs?|personal best|leaderboards?|lb|times?|plat(?:inum)?|gold|silver|bronze|medals?|scores?|runs?|top|fastest|rank|ranked|place|placing|percentile|sub|route|wasans|holder|holds)\b/;

export function findTrials(text: string): WasansTrial[] {
  const words = ` ${lower(text).replace(/[^a-z0-9]+/g, ' ')} `;
  const squashed = flat(text);
  const context = trialContext.test(lower(text)) || /\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds)\b/.test(lower(text));
  const found = wasansTrials.filter((trial) => {
    const name = lower(trial);
    const hit = words.includes(` ${name} `) || (name.includes(' ') && squashed.includes(flat(trial)));
    return hit && (!wordTrials.has(trial) || context);
  });
  // Keep the order the question names them in.
  return found.sort((a, b) => words.indexOf(` ${lower(a)} `) - words.indexOf(` ${lower(b)} `));
}

const districtNames = ['Downtown', 'Dirwik', 'Fragment', 'Stack'];

export function findDistricts(text: string) {
  const words = ` ${lower(text).replace(/[^a-z0-9]+/g, ' ')} `;
  return districtNames.filter((name) => {
    if (!words.includes(` ${lower(name)} `)) return false;
    // "stack" is also a verb.
    return name !== 'Stack' || /\bstack\b.*\b(district|trials?|tt|area|map|checkpoints?)\b|\b(district|trials?|tt|area|map|in)\s+stack\b/.test(lower(text));
  });
}

export function findCombo(text: string): ComboCategory | null {
  const value = lower(text);
  if (!/\bcombos?\b/.test(value)) return null;
  return comboCategories.find((category) => new RegExp(`\\b${category}\\b`).test(value)) ?? null;
}

// "my pb", "what rank am i", "how good am i"
export function asksAboutSelf(text: string) {
  // "show me", "tell me" are about the request, not the asker.
  const value = lower(text).replace(/\b(show|tell|give|let|help|send|get|teach|remind)\s+me\b/g, ' ');
  const self = /\b(my|mine|me|am i|i am|i'm|im|i have|i got|i get|do i|did i|i (?:place|rank|stand|sit))\b/.test(value);
  const stat = /\b(pbs?|personal bests?|rank|ranked|score|tier|place|placing|position|times?|stats|runs?|profile|percentile|best|worst|weakest|strongest|grind|improve|standing|leaderboard)\b/.test(value);
  return self && stat;
}

export function findTimes(text: string, hasTrial: boolean) {
  const value = lower(text);
  const times: number[] = [];
  for (const match of value.matchAll(/\b(\d{1,2}):(\d{2}(?:\.\d{1,3})?)\b/g)) times.push(Number(match[1]) * 60 + Number(match[2]));
  for (const match of value.matchAll(/(?<![\d.:])(\d{1,3}(?:\.\d{1,3})?)\s*(?:s|sec|secs|seconds)\b/g)) times.push(Number(match[1]));
  if (!times.length && hasTrial && !/\b(alpha|beta|version|update|patch)\b/.test(value)) {
    for (const match of value.matchAll(/(?<![\d.:])(\d{1,3}\.\d{1,3})(?![\d.])/g)) {
      const number = Number(match[1]);
      if (number >= 1 && number <= 300) times.push(number);
    }
  }
  return Array.from(new Set(times));
}

export function findScore(text: string) {
  const value = lower(text);
  if (!/\b(score|tier|elite|router|master|diamond|wasans|rank)\b/.test(value)) return null;
  const match = value.match(/(?<![\d.])(0?\.\d{1,3}|1\.0{1,3}|1)(?![\d.])/);
  if (!match) return null;
  const score = Number(match[1]);
  return score >= 0 && score <= 1 ? score : null;
}

export function findLevels(text: string) {
  const value = lower(text);
  const levels: number[] = [];
  for (const match of value.matchAll(/\b(?:level|lvl|lv|rank)\s*(\d{1,3})(?:\s*(?:to|-|->|and)\s*(?:level|lvl|lv)?\s*(\d{1,3}))?\b/g)) {
    levels.push(Number(match[1]));
    if (match[2]) levels.push(Number(match[2]));
  }
  if (!levels.length && /\b(xp|level|lvl|exp)\b/.test(value)) {
    const range = value.match(/\bfrom\s+(\d{1,3})\s+to\s+(\d{1,3})\b/);
    if (range) levels.push(Number(range[1]), Number(range[2]));
  }
  return levels.filter((level) => level >= 1 && level <= 999);
}

export function extractEntities(text: string, playerNames: string[] = []): Entities {
  const trials = findTrials(text);
  const value = lower(text);
  const percent = value.match(/(?<![\d.])(\d{1,3}(?:\.\d+)?)\s*%/);
  const multiplier = /\b(multiplier|mult|xp)\b/.test(value)
    ? value.match(/\bx\s*(\d+(?:\.\d+)?)\b|(?<![\d.])(\d+(?:\.\d+)?)\s*x\b/)
    : null;
  const top = value.match(/\b(?:top|first|best)\s+(\d{1,3})\b/);
  const range = /\b(this|last|past)\s+week\b|\b7\s*d(?:ays)?\b/.test(value) ? '7d'
    : /\b(this|last|past)\s+month\b|\b30\s*d(?:ays)?\b/.test(value) ? '30d'
      : /\b(this|last|past)\s+year\b|\b1\s*y\b/.test(value) ? '1y'
        : /\b(all time|ever|alltime)\b/.test(value) ? 'all' : null;

  return {
    trials,
    districts: findDistricts(text),
    combo: findCombo(text),
    players: findPlayers(text, playerNames),
    me: asksAboutSelf(text),
    times: findTimes(text, trials.length > 0),
    score: findScore(text),
    levels: findLevels(text),
    percent: percent ? Math.min(100, Number(percent[1])) : null,
    multiplier: multiplier ? Number(multiplier[1] ?? multiplier[2]) : null,
    vip: /\bvip\b/.test(value),
    top: top ? Math.min(200, Math.max(1, Number(top[1]))) : null,
    range,
  };
}

const playerContext = /\b(who|player|players|pbs?|profile|rank|ranked|stats|score|tier|runs?|submitted|holds?|beat|vs|versus|compare|better|than)\b|'s\b|’s\b/;

// Player names from the Wasans list that the question mentions. Names that
// look like ordinary words also need some sign the question is about a player.
export function findPlayers(text: string, names: string[]) {
  if (!names.length) return [];
  const value = lower(text);
  const words = ` ${value.replace(/[^a-z0-9_\-]+/g, ' ')} `;
  const context = playerContext.test(value);
  const hits = names.filter((name) => {
    const key = lower(name).trim();
    if (key.length < 3) return false;
    const plain = key.replace(/[^a-z0-9_\-]+/g, ' ').trim();
    if (!plain || !words.includes(` ${plain} `)) return false;
    const distinctive = /[0-9_]/.test(name) || /[a-z][A-Z]/.test(name) || plain.length >= 7;
    return distinctive || context;
  });
  // A longer name that contains a shorter one wins ("jahz2" over "jahz").
  return hits.filter((name) => !hits.some((other) => other !== name && lower(other).includes(lower(name))));
}
