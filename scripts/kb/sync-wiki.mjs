// Pulls parkourreborn.wiki into knowledge/.
//
//   npm run kb:wiki              sync every page in wiki-pages.mjs, then run kb:build
//   node scripts/kb/sync-wiki.mjs --dry     show what would change, write nothing
//   node scripts/kb/sync-wiki.mjs --adopt   also take over existing docs that have no markers yet
//
// What the sync owns, and what it never touches:
// * Inside a doc, only the text between `<!-- wiki:start ... -->` and
//   `<!-- wiki:end -->` is replaced. Anything above or below the markers
//   (like a "## Quick Facts" section) is yours and stays.
// * In the frontmatter, only the `wiki_aliases:` list is replaced. title,
//   category, aliases, tags, summary and the rest are yours; the build merges
//   wiki_aliases into aliases.
// * Docs without markers are never written (unless --adopt), and docs that
//   no wiki page maps to (players, glossary, wasans, ...) are never read.
// * A new wiki page (or a new update log entry) creates a new doc.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { devlogsDoc, wikiPages } from './wiki-pages.mjs';

const api = 'https://parkourreborn.wiki/w/api.php';
const userAgent = 'kb-sync/1.0';
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', 'knowledge');
const dry = process.argv.includes('--dry');
const adopt = process.argv.includes('--adopt');

const start = (page) => `<!-- wiki:start page="${page}" (synced from parkourreborn.wiki by npm run kb:wiki; text between these markers is replaced on every sync) -->`;
const end = '<!-- wiki:end -->';

// ---------------------------------------------------------------- wiki API

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(params) {
  const url = `${api}?${new URLSearchParams({ ...params, format: 'json', formatversion: '2' })}`;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(60_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt >= 3) throw new Error(`wiki request failed (${params.action} ${params.page ?? params.titles ?? ''}): ${error.message}`);
      await sleep(2000 * attempt);
    }
  }
}

async function wikitext(titles) {
  const out = {};
  for (let i = 0; i < titles.length; i += 20) {
    const data = await call({ action: 'query', prop: 'revisions', rvprop: 'content', rvslots: 'main', titles: titles.slice(i, i + 20).join('|') });
    for (const page of data.query?.pages ?? []) out[page.title] = page.revisions?.[0]?.slots?.main?.content ?? '';
  }
  return out;
}

async function rendered(page) {
  const data = await call({ action: 'parse', page, prop: 'text', disablelimitreport: '1' });
  return data.parse.text;
}

// Redirect titles point at a page ("Mantras Hideout" -> Mantra) and make good aliases.
async function redirectAliases() {
  const list = await call({ action: 'query', list: 'allpages', apfilterredir: 'redirects', aplimit: '500' });
  const titles = (list.query?.allpages ?? []).map((page) => page.title);
  const byTarget = {};
  for (let i = 0; i < titles.length; i += 50) {
    const data = await call({ action: 'query', titles: titles.slice(i, i + 50).join('|'), redirects: '1' });
    for (const { from, to } of data.query?.redirects ?? []) (byTarget[to] ??= []).push(from.toLowerCase());
  }
  return byTarget;
}

// ------------------------------------------------------- HTML -> markdown

const voidTags = new Set(['br', 'img', 'hr', 'input', 'meta', 'link', 'wbr', 'source', 'col', 'area', 'embed', 'param', 'track']);
const skipTags = new Set(['style', 'script', 'sup', 'noscript']);

function decode(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function htmlToText(html) {
  const out = [];
  let skip = 0;
  let row = null;
  let cell = null;
  const add = (text) => (cell ? cell.push(text) : out.push(text));
  const tokens = html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>|([^<]+)/g);
  for (const [, closing, rawName, attrs = '', data] of tokens) {
    if (data !== undefined) {
      if (!skip) add(decode(data));
      continue;
    }
    const name = rawName.toLowerCase();
    const isVoid = voidTags.has(name) || attrs.trim().endsWith('/');
    if (!closing) {
      const cls = attrs.match(/class="([^"]*)"/)?.[1] ?? '';
      const id = attrs.match(/id="([^"]*)"/)?.[1] ?? '';
      if (skip) {
        if (!isVoid) skip++;
        continue;
      }
      if (skipTags.has(name) || /mw-editsection|navbox|mw-references/.test(cls) || id === 'toc') {
        if (!isVoid) skip++;
        continue;
      }
      if (/^h[1-5]$/.test(name)) out.push(`\n\n${'#'.repeat(Number(name[1]))} `);
      else if (name === 'p' || name === 'div' || name === 'br') out.push('\n');
      else if (name === 'li') out.push('\n* ');
      else if (name === 'tr') row = [];
      else if (name === 'td' || name === 'th') cell = [];
      continue;
    }
    if (skip) {
      if (!voidTags.has(name)) skip--;
      continue;
    }
    if ((name === 'td' || name === 'th') && cell && row) {
      row.push(cell.join('').replace(/\s+/g, ' ').trim());
      cell = null;
    } else if (name === 'tr' && row) {
      if (row.some(Boolean)) out.push(`\n| ${row.join(' | ')} |`);
      row = null;
    } else if (/^(h[1-5]|p|li)$/.test(name)) out.push('\n');
  }
  let text = out.join('').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
  const dropped = new Set(['Load video', 'YouTube', 'Continue', 'Dismiss', '*', 'Song', 'TOGGLE ALL', '+ -']);
  text = text.split('\n').filter((line) => {
    const s = line.trim();
    return !dropped.has(s) && !s.startsWith('YouTube might collect') && !/^\[\d+\]$/.test(s);
  }).map((line) => line.trimEnd()).join('\n');
  return text.replace(/\n\* *\n/g, '\n').replace(/\n{3,}/g, '\n\n');
}

// --------------------------------------------------- wikitext -> markdown

const titleCase = (text) => text.replace(/[A-Za-z]+/g, (word) => word[0].toUpperCase() + word.slice(1).toLowerCase());

function cleanWikitext(text) {
  return text
    .replace(/�/g, "'").replace(/Caf'/g, 'Café')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\[\[(?:File|Image|Category):[^[\]]*(?:\[\[[^\]]*\]\][^[\]]*)*\]\]/gi, '')
    .replace(/\[\[[^\]|]*\|([^\]]*)\]\]/g, '$1')
    .replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/\[https?:\/\/\S+ ([^\]]+)\]/g, '$1')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<\/?(?:i|b|u|s|small|big|center|span|div|font|sup|sub|nowiki|tt|code)[^>]*>/g, '')
    .replace(/'''''(.*?)'''''/g, '**$1**').replace(/'''(.*?)'''/g, '**$1**').replace(/''(.*?)''/g, '$1')
    .replace(/^(=+)\s*(.*?)\s*=+\s*$/gm, (_, level, heading) => `${'#'.repeat(level.length)} ${titleCase(heading.trim())}`)
    .replace(/^(\*+)\s*/gm, (_, stars) => `${'  '.repeat(stars.length - 1)}* `)
    .replace(/__\w+__/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Galleries keep their image names ("Divided's loadout.png|Has a rare chance...").
function galleryWikitext(text) {
  let out = text
    .replace(/\{\{Angle[^}]*\}\}/g, '')
    .replace(/\{\{Icon\|([^}|]*)[^}]*\}\}/g, '$1')
    .replace(/\{\{Button\|text=([^}]*)\}\}/g, '$1')
    .replace(/<gallery[^>]*>([\s\S]*?)<\/gallery>/g, (_, inner) => {
      const rows = [];
      for (const line of inner.trim().split('\n')) {
        const at = line.indexOf('|');
        if (at < 0) continue;
        const name = line.slice(0, at).trim().replace(/\.(png|jpe?g|gif|webp|mp4)$/i, '').replace(/_/g, ' ').replace(/^(Graffiti|Sticky Note|Billboard|Poster|Badge) - /, '').trim();
        const caption = line.slice(at + 1).replace(/\|?link=[^|]*/g, '').replace(/<hr>/g, ' — ').replace(/<br>/g, ' ').trim();
        rows.push(`* ${name}: ${caption}`);
      }
      return `\n${rows.join('\n')}\n`;
    })
    .replace(/\|-\|([^=\n]+)=/g, (_, tab) => `\n== ${titleCase(tab.trim())} ==\n`)
    .replace(/<\/?tabber>/g, '');
  out = cleanWikitext(out);
  const header = out.match(/\{\{Header\s*\n\|title = .*?\n\|desc =([\s\S]*?)\n\|width.*?\n\}\}/);
  if (header) out = out.replace(header[0], header[1].trim());
  return out
    .replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/<\/?[a-z][^>]*>/g, '')
    .replace(/[ \t]+/g, ' ').replace(/ — +/g, ' — ')
    .replace(/^\{\{.*$\n?/gm, '').replace(/^.*\}\}\s*$\n?/gm, '')
    .replace(/\n{3,}/g, '\n\n').trim();
}

// ------------------------------------------------------------ page tidy

function tidy(text, { infobox = true } = {}) {
  const lines = [];
  for (const line of text.split('\n').slice(text.startsWith('# ') ? 1 : 0)) {
    const s = line.trim();
    if (s.includes('[ Expand All') || s.includes('Expand AllCollapse All')) break; // navbox
    if (['VIEW ANGLES HIDE ANGLES', 'EDIT', 'Map angle', 'HIDE ANGLES', 'VIEW ANGLES'].includes(s)) continue;
    lines.push(line);
  }
  let out = lines.join('\n').replace(/^# /gm, '## ');

  // Infobox: "### Field\n\nvalue" lines in the first section become "* Field: value".
  if (infobox) {
    out = out.replace(/^## [^\n]+\n+(?=### )(?:(?:###[^\n]*|(?!## )[^\n]*)\n)*?(?=## )/m, (block) => {
      const rows = [];
      const prose = [];
      for (const [, name, value] of block.matchAll(/^### (.+?)\n+((?:(?!###|## ).*\n?)*)/gm)) {
        let parts = value.trim().split('\n').map((part) => part.trim().replace(/^[* ]+/, '').trim()).filter(Boolean);
        // Long paragraphs after the last field are the page's overview.
        const cut = parts.findIndex((part) => part.length > 160);
        if (cut >= 0) {
          prose.push(parts.slice(cut).join('\n\n'));
          parts = parts.slice(0, cut);
        }
        const joined = parts.map((part) => (part === part.toUpperCase() && part.length > 3 && /[A-Z]/.test(part) ? titleCase(part) : part)).join(', ');
        const label = name.trim() === name.trim().toUpperCase() ? titleCase(name.trim()) : name.trim();
        if (joined) rows.push(`* ${label}: ${joined}`);
      }
      return `## Info\n${rows.join('\n')}\n\n${prose.length ? `## Overview\n\n${prose.join('\n\n')}\n\n` : ''}`;
    });
  }

  // Skin/variant tabs ("* Default * Halloween") before the first heading.
  const first = out.indexOf('\n## ');
  if (first >= 0 && out.slice(0, first).split('\n').every((line) => !line.trim() || /^\* ?\w[\w ]{0,20}$/.test(line.trim()))) {
    out = `## ${out.slice(first + 4)}`;
  }

  // Table rows separated by blank lines become one table with a header rule.
  out = `${out}\n`.replace(/(?:^\|[^\n]*\|[ \t]*\n(?:[ \t]*\n)?)+/gm, (match) => {
    if (!match.includes('\n|')) return match;
    const rows = match.split('\n').filter((row) => row.trim());
    const columns = Math.max(rows[0].split('|').length - 2, 1);
    return `${[rows[0], `|${' --- |'.repeat(columns)}`, ...rows.slice(1)].join('\n')}\n\n`;
  });
  return out.replace(/\n{3,}/g, '\n\n').trim();
}

// Noise every rendered page can carry.
function cleanNoise(text) {
  return text
    .replace(/^ ?(\S[^\n]*?)\n\n (Permanent Upgrade|Temporary Upgrade|Consumable|Gamepass|Bundle|[A-Z][a-z]+ Upgrade)\n\n ([\d,]+)\n\n \[ TOGGLE DESCRIPTION \]\n\n (.+)$/gm, '* **$1** ($2, $3): $4')
    .replace(/^.*(?:VIDEO DEMONSTRATION|Local Filehttps?:\/\/|Image Play Video|\[ TOGGLE DESCRIPTION \]).*\n?/gm, '')
    .replace(/^(?:Play Video|Visit the page\.|REVEALHIDE)\s*\n/gm, '')
    .replace(/^\* Audio: https?:\/\/\S+\n/gm, '')
    .replace(/^ ?(\S.*?) \[ (?:Expand Collapse|Collapse Expand) \]\s*$/gm, '### $1')
    .replace(/\| PRICE \|/g, '| PRICE (CREDITS OR TOKENS) |')
    // A shouted page banner ("MOVEMENT", "CRAFTING HUB") on the first line.
    .replace(/^[A-Z][A-Z &'-]{2,30}\n+/, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function dropSections(text, names) {
  let out = text;
  for (const name of names) out = out.replace(new RegExp(`\\n## ${name}\\n[\\s\\S]*?(?=\\n## |$)`), '\n');
  return out;
}

// ------------------------------------------------------- page handlers

// The wiki's expandable ability rows -> one section per ability or tech.
function abilities(text) {
  const row = /^\| \+ \| (.+?) \| (.*?) \|(.*?)\|\s*$/;
  const cellText = (s) => s.replace(/\[ (?:REVEAL|HIDE) \]/g, '').replace('VIEW ANGLES HIDE ANGLES', '').replace(/\s+/g, ' ').trim();
  const lines = text.split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const head = line.match(row);
    if (head && lines[i + 1]?.startsWith('| --- |')) lines.splice(i + 1, 1);
    if (head && /^\| \+ \| \|\s*$/.test(lines[i + 1] ?? '') && lines[i + 2] !== undefined) {
      const [name, keys, condition] = head.slice(1).map(cellText);
      const cells = lines[i + 2].trim().replace(/^\||\|$/g, '').split(' | ').map((c) => c.trim());
      let desc = cells[0];
      const prefix = [name, keys, condition].filter(Boolean).join(' ');
      if (desc.startsWith(prefix)) desc = desc.slice(prefix.length);
      else if (desc.startsWith(name)) desc = desc.slice(name.length);
      desc = cellText(desc);
      const extra = cells.length > 1 ? cellText(cells.slice(1).join(' ')) : '';
      let title = titleCase(name).replace(/ Aka /g, ' (aka ').replace(/ W\/ /g, ' with ');
      if (title.includes('(aka ')) title += ')';
      out.push(`### ${title}`);
      const inputs = keys + (condition ? ` (${condition})` : '');
      if (inputs) out.push(`* Input: ${inputs}`);
      if (desc) out.push(`* ${desc}`);
      if (extra) out.push(/^obtained/i.test(extra) ? extra : `* How to get it: ${extra}`);
      out.push('');
      i += 2;
      continue;
    }
    const label = line.match(/^ ([A-Z][A-Z &/-]{2,})\s*$/);
    if (label) {
      out.push(`## ${titleCase(label[1])}`);
      continue;
    }
    const s = line.trim();
    if (s.length >= 6 && /^[A-Z0-9 /+&().-]+$/.test(s) && !line.startsWith('#')) continue; // tab strips
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n');
}

// One section per resource, with compact locations. Recipe grids are dropped:
// the crafting recipe docs cover them and drive the recipe cards.
function crafting(text) {
  let out = text.replace(/^CRAFTING HUB\n+ ?/, '');
  const recipes = out.indexOf('## Recipes');
  const resource = out.search(/^ \S.*? (?:Core Component|Component|Gear Modifier|Material|Resource)\s*\n Total in the game/m);
  if (recipes >= 0 && resource > recipes) {
    out = `${out.slice(0, recipes)}## Resources\n\nEvery resource, how many exist in the game, and where each one is (bought from a vendor or found on the map). Vendor prices are credits or tokens.\n\n${out.slice(resource)}`;
  }
  return out
    .replace(/ HOW TO OBTAIN\n+\| MAP VIEW[\s\S]*?\| CLOSE \|\n/g, (block) => {
      const near = block.match(/\| NEAREST CHECKPOINT\(s\) \| (.*?) \|/)?.[1]?.trim();
      const note = block.match(/\| NOTES \| (.+?) \|/)?.[1]?.trim();
      return `${[near && `Nearest checkpoints: ${near}`, note && `Note: ${note}`].filter(Boolean).join('\n')}\n`;
    })
    .replace(/^ (\S.*?) (Core Component|Component|Gear Modifier|Material|Resource)\s*\n Total in the game: (\d+)/gm, '### $1\nType: $2. Total in the game: $3.')
    .replace(/^ ?View Location\(s\)\n? ?Hide Location\(s\)\n/gm, '')
    .replace(/^Bought from (\w+)\n+ ([\d,]+ or [\d,]+)\n+Stock: (\d+)/gm, 'Bought from $1 for $2 (credits or tokens), stock $3.')
    .replace(/^(?:Original interactive map: .*|Loading scripts)\n/gm, '')
    .replace(/\n## Gallery[\s\S]*$/, '\n');
}

const rarities = 'Common|Uncommon|Rare|Epic|Legendary|Ultimate|Mythic|Mythical|Limited|Exclusive|Holiday';

// Skin lists -> one "Name (Rarity), ..." line per bag.
function cosmetics(text) {
  let out = text
    .replace(/^ ?([A-Z][A-Z ()]+BAG(?: \([A-Z]+\))?) \[ (?:Collapse Expand|Expand Collapse) \]/gm, (_, bag) => `### ${titleCase(bag)}`)
    .replace(/^[A-Z ]{10,}$\n/gm, '')
    .replace(new RegExp(`^(\\S[^\\n]*)\\n\\n(${rarities})\\s*$`, 'gm'), '$1 ($2)')
    .replace(/^(\w+ Bag):\n ([\d,]+) or\n ([\d,]+)/gm, '* $1: $2 credits or $3 tokens');
  out = out.replace(/(^### [^\n]*Bag[^\n]*\n)([\s\S]*?)(?=^#{2,3} )/gm, (_, head, body) => {
    const items = [];
    const other = [];
    for (const line of body.split('\n').map((l) => l.trim()).filter(Boolean)) {
      if (new RegExp(`\\((?:${rarities})\\)$`).test(line)) {
        for (const item of line.split(/,\s*/)) if (!items.includes(item)) items.push(item);
      } else if (!other.includes(line)) other.push(line);
    }
    return `${head}\n${[items.join(', '), ...other].filter(Boolean).join('\n\n')}\n\n`;
  });
  return out;
}

function checkpoints(text, source) {
  const dynamic = source.split('|-|')[1] ?? '';
  const parts = dynamic.split(/^=== (.+?) ===\s*$/m);
  const lines = ['## Checkpoints List', '', 'Every checkpoint by district. Time trial and challenge start points also act as checkpoints.', ''];
  let district = '';
  for (let i = 1; i < parts.length; i += 2) {
    const name = parts[i].trim();
    const groups = {};
    for (const [, title, type] of parts[i + 1].matchAll(/\{\{Checkpoint\|title\s*=\s*([^|]+?)\s*\|type\s*=\s*([^|]+?)\s*\|/g)) (groups[type] ??= []).push(title);
    if (!Object.keys(groups).length) continue;
    if (name === 'Time Trials & Challenges') lines.push(`### ${district} Time Trials & Challenges`);
    else {
      district = name;
      lines.push(`### ${name}`);
    }
    const labels = { Checkpoint: 'Checkpoints', 'Time Trial': 'Time trial checkpoints', Challenge: 'Challenge checkpoints' };
    for (const [type, titles] of Object.entries(groups)) lines.push(`* ${labels[type] ?? type} (${titles.length}): ${titles.join(', ')}`);
    lines.push('');
  }
  const at = text.indexOf('## Checkpoints List');
  if (at < 0) return text;
  const next = text.indexOf('\n## ', at + 5);
  return text.slice(0, at) + lines.join('\n') + (next >= 0 ? text.slice(next) : '');
}

function templateFields(body) {
  const fields = {};
  for (const [, key, value] of body.matchAll(/^\|\s*([^=\n|]+?)\s*(?:=|:)\s*(.*)$/gm)) {
    const raw = value.replace(/\{\{Icon\|[^}]*\}\}/g, '').replace(/'''Learn (.*?)'''\s*<br>\s*/, 'Teaches $1. ').replace(/'''/g, '');
    fields[key.trim().toLowerCase()] = cleanWikitext(raw).replace(/\*\*/g, '').trim();
  }
  return fields;
}

function races(text, source) {
  const out = ['Races are short courses spread across the city: time trials and challenges. There are also PvP races against other players.', ''];
  const tabs = source.split(/\|-\|([A-Z ]+)=/);
  const sections = (body) => {
    const parts = body.split(/^==\s*(.+?)\s*==\s*$/m);
    const list = [];
    for (let i = 1; i < parts.length; i += 2) list.push([parts[i].replace(/<[^>]+>/g, '').replace(/=/g, '').trim(), parts[i + 1]]);
    return list;
  };
  for (let t = 1; t < tabs.length; t += 2) {
    const tab = tabs[t].trim();
    if (tab === 'TIME TRIALS') {
      out.push('## Time Trials', '', 'Medal targets are bronze / silver / gold / platinum, in seconds. Bronze gives 1 rank star, silver 2, gold 3 and platinum 4 (a full rank up), counting every lower medal. Difficulties from easiest: basic, moderate, tough, advanced, insane. Players can teleport to time trials they have interacted with.', '');
      for (const [name, body] of sections(tabs[t + 1])) {
        const rows = [...body.matchAll(/\{\{Time Trial\s*\n([\s\S]*?)\n\}\}/g)].map(([, inner]) => {
          const f = templateFields(inner);
          return `| ${f.title ?? ''} | ${f.difficulty ?? ''} | ${f.desc ?? ''} | ${f.bronze ?? ''} | ${f.silver ?? ''} | ${f.gold ?? ''} | ${f.platinum ?? ''} |`;
        });
        if (rows.length) out.push(`### ${name} Time Trials`, '', '| Trial | Difficulty | Location | Bronze | Silver | Gold | Platinum |', '| --- | --- | --- | --- | --- | --- | --- |', ...rows, '');
      }
    } else if (tab === 'CHALLENGES') {
      out.push('## Challenges', '', 'To complete a challenge you reach its end goal through a series of checkpoints within a time limit. Rewards are rank stars (some challenges teach an ability, advancement challenges unlock the next 10 ranks). Completed challenges can be warped to from the map.', '');
      for (const [name, body] of sections(tabs[t + 1])) {
        const items = [...body.matchAll(/\{\{Challenge\s*\n([\s\S]*?)\n\}\}/g)].map(([, inner]) => {
          const f = templateFields(inner);
          const bits = [`Difficulty: ${f.difficulty ?? ''}`, `Checkpoints: ${f.checkpoints ?? ''}`, `Time limit: ${f.time ?? ''} seconds`, `Reward: ${(f.reward ?? '').trim()} rank stars`];
          for (const key of ['rank required', 'rank cap', 'restriction']) if (f[key]) bits.push(`${titleCase(key)}: ${f[key]}`);
          const desc = (f.desc ?? '').replace(/\.+$/, '');
          return `* **${f.title ?? ''}**${f.type === 'advancement' ? ' (advancement challenge)' : ''}: ${desc}. ${bits.join('; ')}.`;
        });
        if (items.length) out.push(`### ${name} Challenges`, '', ...items, '');
      }
    }
  }
  const pvp = text.indexOf('PvP Races involve');
  if (pvp >= 0) {
    out.push('## PvP Races', '', text.slice(pvp)
      .replace(/^A preview of the PvP Races timer UI while in a race\s*\n/m, '')
      .replace(/^User interface \(\d\/\d\)\s*\n/gm, ''));
  }
  return out.join('\n');
}

function easterEggs(source) {
  let out = galleryWikitext(source).replace(/\n## References[\s\S]*$/, '\n');
  const tabs = { Graffiti: 'Graffiti', 'Sticky Notes': 'Sticky Notes', Billboards: 'Billboards' };
  let tab = null;
  let other = false;
  const lines = [];
  for (const line of out.split('\n')) {
    if (line.startsWith('-OTHER=')) {
      other = true;
      lines.push('### Community Art Graffiti');
      continue;
    }
    if (/^\{\{#tag: tabber \|$|^\}\}$/.test(line)) continue;
    const heading = line.match(/^(#{2,3}) (.+)$/);
    if (heading?.[1] === '##' && !['Downtown', 'Dirwik', 'Fragment', 'Stack'].includes(heading[2])) {
      tab = tabs[heading[2]] ?? null;
      other = false;
      lines.push(line);
      continue;
    }
    if (heading && tab && ['Downtown', 'Dirwik', 'Fragment', 'Stack'].includes(heading[2])) {
      lines.push(`### ${heading[2]} ${other ? 'Community Art Graffiti' : tab}`);
      continue;
    }
    lines.push(line);
  }
  return lines.join('\n').replace('## General\n## User Interface', '## User Interface');
}

function seasonal(source) {
  let event = '';
  return galleryWikitext(source)
    .replace(/^(#{1,2}) (.+)$/gm, (_, level, heading) => {
      if (level.length === 1) {
        event = heading;
        return `## ${heading}`;
      }
      if (/community videos/i.test(heading)) return '';
      return `### ${/\(\d{4}\)/.test(heading) || heading.toLowerCase().includes(event.split(' (')[0].toLowerCase()) ? heading : `${event} ${heading}`}`;
    })
    .replace(/Hidden Harvest (\d{4}) - Location (\d+): Location \d+ - ?/g, 'Location $2: ')
    .replace(/\n{3,}/g, '\n\n');
}

function store(text) {
  return text
    .replace('In-game items purchased with tokens that provide benefits, both permanent and temporary.', 'In-game items purchased with tokens (prices below are in tokens) that provide benefits, both permanent and temporary.')
    .replace('In-game gear that can be purchased or upgraded with tokens.', 'In-game gear that can be purchased or upgraded with tokens. All prices below are in tokens.');
}

// Upcoming content minus its devlogs, which become their own doc.
function upcoming(text) {
  let out = text.replace(/^(?:Gallery|UPCOMING CONTENT| ?VIEW REFERENCES)\s*\n/gm, '');
  const from = out.indexOf('### Devlogs from the Discord Server');
  let devlogs = '';
  if (from >= 0) {
    const to = out.indexOf('\n### ', from + 10);
    devlogs = out.slice(from, to >= 0 ? to : undefined);
    out = out.slice(0, from) + (to >= 0 ? out.slice(to + 1) : '');
  }
  out = out
    .replace(/^### OFFICIAL REBORN ROADMAP/m, '## Official Reborn Roadmap')
    .replace(/^### Future\/Unknown/m, '## Future or Unknown Timing')
    .replace(/^ ([A-Z][a-z]+ \d+, \d{4}) \[ Expand Collapse \]/gm, '### hudzell Stream ($1)')
    .replace(/^[A-Z][a-z]+ \d+, \d{4}\s*\n/gm, '');
  devlogs = devlogs
    .replace('### Devlogs from the Discord Server', '')
    .replace(/^ ?(\d+ \w+ \d{4}) Devlog \[ Expand Collapse \]/gm, '## $1 Devlog')
    .replace(/^Consider subscribing.*\n?/gm, '')
    .replace(/<@&?\d+>/g, '')
    .replace(/https:\/\/discord\.com\/\S+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const intro = 'The developers post a text devlog in the PARKOUR Reborn Discord around the 10th of each month. They describe work in progress for the Beta update and never include release dates.';
  return { body: out, extra: devlogs ? [{ doc: devlogsDoc, page: 'Upcoming Content', body: `${intro}\n\n${devlogs}` }] : [] };
}

// ------------------------------------------------------------- updates

function updateEntries(source) {
  const entries = [];
  for (const [, body] of source.matchAll(/\{\{Update Log\s*\n([\s\S]*?)\n\|id\s*=\s*[^\n]*\n\}\}/g)) {
    const field = (key) => body.match(new RegExp(`^\\|${key}\\s*=\\s*(.*)$`, 'm'))?.[1]?.trim() ?? '';
    const desc = body.split(/\|desc\s*=/)[1] ?? '';
    const version = field('version');
    if (!/^\d/.test(version) || !desc.trim()) continue;
    entries.push({
      version,
      date: field('date'),
      stage: /PRE/i.test(field('stage')) ? 'Pre-Alpha' : 'Alpha',
      seasonal: field('seasonal'),
      build: field('build'),
      desc: cleanWikitext(desc),
    });
  }
  return entries;
}

function updateDoc(entry, latest) {
  const name = `${entry.stage} ${entry.version}`;
  const year = entry.date.split(',').pop().trim();
  const stage = entry.stage.toLowerCase();
  const aliases = [`${stage} ${entry.version} patch notes`, `${stage} ${entry.version}`, `${entry.version} ${stage}`];
  if (entry.stage === 'Alpha') aliases.push(`update ${entry.version}`, `${entry.version} update`, `${entry.version} patch notes`, `${entry.version} changelog`);
  else aliases.push(`pre alpha ${entry.version}`, `pre-alpha ${entry.version} update`);
  if (entry.seasonal) aliases.push(`${entry.seasonal.toLowerCase()} ${year} update`);
  if (latest) aliases.push('latest update', 'newest update', 'new update', 'current version', 'latest patch notes', 'what is new');

  const intro = `${name} was released on ${entry.date} (build ${entry.build}).${entry.seasonal ? ` It was the ${entry.seasonal} ${year} seasonal update.` : ''}${latest ? ' It is the newest update of PARKOUR Reborn.' : ''}`;
  let body = entry.desc
    .replace(/^### /gm, '## ').replace(/^#### /gm, '### ')
    .replace(/^(\s*)\* ([^*]+)\*\*$/gm, '$1* **$2**');
  if (!body.trimStart().startsWith('##')) body = `## Changes\n\n${body}`;
  return {
    doc: {
      path: `updates/${stage}-${entry.version.replace(/\./g, '-')}.md`,
      title: `${name} Patch Notes`,
      category: 'updates',
      summary: intro,
      aliases: [],
      tags: ['updates', 'patch notes', stage, ...(entry.seasonal ? [entry.seasonal.toLowerCase()] : [])],
    },
    wikiAliases: aliases,
    page: 'Update Logs',
    body: `${intro}\n\n${body.trim()}`,
  };
}

function timelineDoc(entries) {
  const table = (stage, label) => [
    '| Version | Date | Stage |',
    '| :---- | :---- | :---- |',
    ...entries.filter((e) => e.stage === stage).map((e) => `| ${e.version} | ${e.date} | ${e.seasonal ? `${e.seasonal} ` : ''}${label} |`),
  ].join('\n');
  return {
    doc: { path: 'miscellaneous/update-timeline.md', title: 'Update Timeline', category: 'miscellaneous', aliases: ['update timeline', 'version history', 'changelog'], tags: ['updates', 'history'] },
    page: 'Update Logs',
    body: `These are recorded release dates. Each version also has its own patch notes page (for example "Alpha 1.73 Patch Notes"). Alpha and Pre-Alpha are separate stages; the same version number can appear in both. The newest update is ${entries[0].stage} ${entries[0].version} (${entries[0].date}).\n\n## Alpha Updates\n\n${table('Alpha', 'Alpha')}\n\n## Pre-Alpha Updates\n\n${table('Pre-Alpha', 'Pre-Alpha')}`,
  };
}

// ------------------------------------------------------------- writing

function yamlList(key, items) {
  return `${key}:\n${items.map((item) => `  - ${item}`).join('\n')}`;
}

function newFrontmatter(doc, wikiAliases) {
  const lines = ['---', `title: ${doc.title}`, `category: ${doc.category}`];
  if (doc.summary) lines.push(`summary: ${doc.summary}`);
  const own = [...new Set(doc.aliases.map((a) => a.toLowerCase()))];
  lines.push(yamlList('aliases', own.length ? own : [doc.title.toLowerCase()]));
  lines.push(yamlList('tags', [...new Set(doc.tags)]));
  if (wikiAliases.length) lines.push(yamlList('wiki_aliases', wikiAliases));
  return `${lines.join('\n')}\n---`;
}

// Replaces only the wiki_aliases block of existing frontmatter.
function setWikiAliases(front, wikiAliases) {
  const lines = front.split('\n');
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^wiki_aliases:/.test(lines[i])) {
      while (/^\s+-\s/.test(lines[i + 1] ?? '')) i++;
      continue;
    }
    kept.push(lines[i]);
  }
  const close = kept.lastIndexOf('---');
  if (wikiAliases.length) kept.splice(close, 0, yamlList('wiki_aliases', wikiAliases));
  return kept.join('\n');
}

const stats = { created: [], updated: [], unchanged: 0, skipped: [] };

function write({ doc, page, body, wikiAliases = [] }) {
  const full = join(root, doc.path);
  const aliases = [...new Set(wikiAliases.map((alias) => alias.toLowerCase().trim()).filter(Boolean))];
  const clean = body.split('\n').map((line) => line.trimEnd()).join('\n').trim();
  const region = `${start(page)}\n\n${clean}\n\n${end}`;
  let next;
  if (!existsSync(full)) {
    next = `${newFrontmatter(doc, aliases)}\n\n${region}\n`;
    stats.created.push(doc.path);
  } else {
    const current = readFileSync(full, 'utf8').replace(/\r\n/g, '\n');
    const head = current.match(/^---\n[\s\S]*?\n---/);
    if (!head) {
      stats.skipped.push(`${doc.path} (no frontmatter)`);
      return;
    }
    let rest = current.slice(head[0].length);
    const a = rest.indexOf('<!-- wiki:start');
    const b = rest.indexOf(end);
    if (a >= 0 && b > a) {
      rest = `${rest.slice(0, a)}${region}${rest.slice(b + end.length)}`;
    } else if (adopt) {
      // First sync of a doc made before markers existed: the part above
      // "## Quick Facts" (or the whole body) was wiki text.
      const quick = rest.indexOf('\n## Quick Facts');
      rest = `\n\n${region}${quick >= 0 ? `\n${rest.slice(quick)}` : '\n'}`;
    } else {
      stats.skipped.push(`${doc.path} (no wiki markers, treated as hand-written; --adopt takes it over)`);
      return;
    }
    next = `${setWikiAliases(head[0], aliases)}${rest}`.replace(/\n*$/, '\n');
    if (next === current) {
      stats.unchanged++;
      return;
    }
    stats.updated.push(doc.path);
  }
  if (!dry) {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, next);
  }
}

// ---------------------------------------------------------------- main

async function main() {
  console.log('kb wiki: reading parkourreborn.wiki...');
  const redirects = await redirectAliases();
  const sources = await wikitext(['Update Logs', 'Races', 'Checkpoints', 'Easter Eggs & Badges', 'Update Logs/Seasonal']);

  for (const [page, config] of Object.entries(wikiPages)) {
    const doc = { title: page, category: config.path.split('/')[0], aliases: [], tags: [config.path.split('/')[0]], ...config };
    let text;
    let extra = [];
    if (config.handler === 'gallery') text = easterEggs(sources[page]);
    else if (config.handler === 'seasonal') text = seasonal(sources[page]);
    else {
      text = tidy(htmlToText(await rendered(page)), { infobox: config.infobox !== false });
      if (config.handler === 'abilities') text = abilities(text);
      if (config.handler === 'crafting') text = crafting(text);
      if (config.handler === 'cosmetics') text = cosmetics(text);
      if (config.handler === 'checkpoints') text = checkpoints(text, sources.Checkpoints);
      if (config.handler === 'races') text = races(text, sources.Races);
      if (config.handler === 'store') text = store(text);
      if (config.handler === 'upcoming') ({ body: text, extra } = upcoming(text));
      if (config.cutFrom) text = text.split(`\n## ${config.cutFrom}\n`)[0];
      if (config.dropSections) text = dropSections(text, config.dropSections);
      text = cleanNoise(text);
      await sleep(300);
    }
    write({ doc, page, body: text, wikiAliases: [page.toLowerCase(), ...(redirects[page] ?? [])] });
    for (const item of extra) write(item);
  }

  const entries = updateEntries(sources['Update Logs']);
  const latest = entries.find((entry) => entry.stage === 'Alpha');
  for (const entry of entries) write(updateDoc(entry, entry === latest));
  if (entries.length) write(timelineDoc(entries));

  const verb = dry ? 'would be ' : '';
  console.log(`kb wiki: ${stats.created.length} ${verb}created, ${stats.updated.length} ${verb}updated, ${stats.unchanged} unchanged`);
  for (const path of stats.created) console.log(`  + ${path}`);
  for (const path of stats.updated) console.log(`  ~ ${path}`);
  for (const path of stats.skipped) console.warn(`  skipped ${path}`);
}

main().catch((error) => {
  console.error(`kb wiki: ${error.message}`);
  process.exitCode = 1;
});
