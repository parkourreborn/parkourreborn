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
  // A leaderboard position asked about: "20th place", "#20", "who is rank 20".
  place: number | null;
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
  // A time ("7.2s") or a place ("#5", "2nd") also makes it about trials.
  const context = trialContext.test(lower(text)) || /\d+(?:\.\d+)?\s*(?:s|sec|secs|seconds)\b|#\s*\d|\b\d{1,3}(?:st|nd|rd|th)\b/.test(lower(text));
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

// "rank 20" is a level in XP questions and a position in leaderboard ones.
const boardContext = /\b(leaderboards?|lb|who|whos|who's|wasans|overall|place|placed|position|spot)\b/;
const levelContext = /\b(xp|exp|level|lvl|lv)\b/;
const rankIsPlace = (value: string) => boardContext.test(value) && !levelContext.test(value);

export function findPlace(text: string, hasTrial = false) {
  const value = lower(text);
  const ordinal = value.match(/\b(\d{1,3})(?:st|nd|rd|th)\b/);
  const numbered = value.match(/(?:#|\b(?:place|position|spot|number)\s+#?)\s*(\d{1,3})\b/);
  const ranked = rankIsPlace(value) ? value.match(/\brank(?:ed)?\s+#?(\d{1,3})\b/) : null;
  // An ordinal alone could be a date ("october 20th").
  const place = (ordinal && (hasTrial || boardContext.test(value)) ? ordinal[1] : null) ?? numbered?.[1] ?? ranked?.[1];
  const number = Number(place);
  return place && number >= 1 && number <= 200 ? number : null;
}

export function findLevels(text: string) {
  const value = lower(text);
  const levels: number[] = [];
  const pattern = rankIsPlace(value)
    ? /\b(?:level|lvl|lv)\s*(\d{1,3})(?:\s*(?:to|-|->|and)\s*(?:level|lvl|lv)?\s*(\d{1,3}))?\b/g
    : /\b(?:level|lvl|lv|rank)\s*(\d{1,3})(?:\s*(?:to|-|->|and)\s*(?:level|lvl|lv)?\s*(\d{1,3}))?\b/g;
  for (const match of value.matchAll(pattern)) {
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
    place: findPlace(text, trials.length > 0),
    range,
  };
}

const playerContext = /\b(who|player|players|pbs?|profile|rank|ranked|stats|score|tier|runs?|submitted|holds?|beat|vs|versus|compare|better|than)\b|'s\b|’s\b/;

// A name in the spot a player goes is a player: next to a run word ("jahz
// time on glass", "what has jahz done") or asked about by place ("what place
// is audio at", "where is audio", "audio on the lb"). Only in that spot,
// because the words alone are too common ("random time trial", "is the
// leaderboard random", "how far is 10th place" are not players).
const playerSlot = (words: string, plain: string) => words.includes(` has ${plain} `) || words.includes(` did ${plain} `)
  || new RegExp(` ${plain} (?:s )?(?:time(?! trials? )|times|pbs?|best|records?|wrs?) `).test(words)
  || new RegExp(` (?:place|placed|placing|position|rank|spot|standing) (?:.* )?(?:is|does|did|has) ${plain} `).test(words)
  || new RegExp(` where(?: is| s|s) ${plain} `).test(words)
  || new RegExp(` ${plain} (?:s )?(?:at|on|in) (?:the )?(?:wasans |overall )*(?:leaderboards?|lb) `).test(words);

// 'what rank is "audio"': quotes mark a name.
const quotes = /["'`“”‘’]/;
function inQuotes(value: string, key: string) {
  for (let at = value.indexOf(key); at !== -1; at = value.indexOf(key, at + 1)) {
    if (quotes.test(value[at - 1] ?? '') && quotes.test(value[at + key.length] ?? '')) return true;
  }
  return false;
}

// Player names from the Wasans list that the question mentions, in the order
// it mentions them. Names that look like ordinary words also need some sign
// the question is about a player.
export function findPlayers(text: string, names: string[]) {
  if (!names.length) return [];
  const value = lower(text);
  const words = ` ${value.replace(/[^a-z0-9_\-]+/g, ' ')} `;
  const context = playerContext.test(value);
  const hits: { name: string; at: number }[] = [];
  for (const name of names) {
    const key = lower(name).trim();
    if (key.length < 3) continue;
    const plain = key.replace(/[^a-z0-9_\-]+/g, ' ').trim();
    if (!plain) continue;
    const distinctive = /[0-9_]/.test(name) || /[a-z][A-Z]/.test(name) || plain.length >= 7;
    const exact = words.indexOf(` ${plain} `);
    if (exact !== -1) {
      if (distinctive || context || playerSlot(words, plain) || inQuotes(value, key)) hits.push({ name, at: exact });
      continue;
    }
    // "timpanzees thread time": an s with no apostrophe. Ordinary-word names
    // ("star" in "stars") only count right next to a run word.
    const withS = words.indexOf(` ${plain}s `);
    if (withS !== -1 && (distinctive || playerSlot(words, `${plain}s`))) hits.push({ name, at: withS });
  }
  // A longer name that contains a shorter one wins ("jahz2" over "jahz").
  return hits
    .filter((hit) => !hits.some((other) => other.name.length > hit.name.length && lower(other.name).includes(lower(hit.name))))
    .sort((a, b) => a.at - b.at)
    .map((hit) => hit.name);
}
