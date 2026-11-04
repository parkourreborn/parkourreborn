// Builds src/generated/kb.json from the markdown in knowledge/.
//
//   node scripts/kb/build.mjs           build, print problems, fail on errors
//   node scripts/kb/build.mjs --check   same, plus the full list of stubs and shared aliases
//
// The markdown stays the only place content is edited. This step checks it,
// splits every doc into section chunks with a breadcrumb, pulls out the
// structured bits tools need (recipes, trial locations) and writes one JSON
// file the server imports, so nothing is read from disk at request time.

import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const chunkLimit = 1600;
const stubChars = 400;

const unquote = (value) => value.trim().replace(/^['"]|['"]$/g, '').trim();

export function parseFrontmatter(raw) {
  const head = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!head) return { meta: {}, body: raw.trim() };

  const meta = {};
  let key = '';
  for (const line of head[1].split(/\r?\n/)) {
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) {
      if (Array.isArray(meta[key])) meta[key].push(unquote(item[1]));
      continue;
    }
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) continue;
    key = pair[1];
    const value = pair[2].trim();
    if (!value) meta[key] = [];
    else if (value.startsWith('[')) meta[key] = value.slice(1, -1).split(',').map(unquote).filter(Boolean);
    else meta[key] = unquote(value);
  }

  return { meta, body: raw.slice(head[0].length).trim() };
}

const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : value ? [value] : []);
const text = (value) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

export const categoryLabel = (category) => category
  .split('-')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');

// First plain sentence of the body, used when a doc has no summary of its own.
// Docs that open with a list or table fall back to their first list item, then
// to their section names.
export function autoSummary(body, title = '') {
  const lines = body.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  const plain = lines.find((value) => !value.startsWith('#') && !value.startsWith('|') && !/^[*-]\s/.test(value) && !/:$/.test(value));
  const bullet = lines.find((value) => /^[*-]\s/.test(value))?.replace(/^[*-]\s+/, '');
  const line = plain ?? bullet;
  if (line) return (line.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? line).replace(/\*\*/g, '').slice(0, 220);

  const sections = lines.filter((value) => /^#{2,3}\s/.test(value)).map((value) => value.replace(/^#+\s+/, ''));
  return sections.length ? `${title}: ${sections.slice(0, 6).join(', ')}`.slice(0, 220) : title;
}

// Recipe blocks inside crafting docs:
//   ## Yank Grappler I
//   Recipe:
//   * Middle: Base Grappler
//   * Override Module ×1
export function extractRecipes(body) {
  const recipes = [];
  const lines = [];
  let item = '';
  let current = null;

  const flush = () => {
    if (current && current.middle) recipes.push(current);
    current = null;
  };

  for (const raw of body.split(/\r?\n/)) {
    const line = raw.trim();
    const heading = line.match(/^#{2,3}\s+(.+)$/);
    if (heading) {
      flush();
      item = heading[1].trim();
      lines.push(raw);
      continue;
    }
    if (/^recipe:?$/i.test(line)) {
      flush();
      current = { item, middle: '', items: [] };
      lines.push(`Recipe: shown on the ${item} recipe card.`);
      continue;
    }
    if (current) {
      const bullet = line.match(/^[*-]\s+(.+)$/);
      if (bullet) {
        const middle = bullet[1].match(/^middle:\s*(.+)$/i);
        const amount = bullet[1].match(/^(.+?)\s*[×x]\s*(\d+)$/i);
        if (middle) current.middle = middle[1].trim();
        else if (amount) current.items.push({ name: amount[1].trim(), quantity: Number(amount[2]) });
        else current.items.push({ name: bullet[1].trim(), quantity: 1 });
        continue;
      }
      if (line) flush();
    }
    lines.push(raw);
  }
  flush();

  return { recipes, body: lines.join('\n') };
}

// | Time Trial | Difficulty | Location | tables in the district trial docs.
export function extractTrials(body, district) {
  const rows = body.split(/\r?\n/).filter((line) => /^\s*\|/.test(line));
  if (rows.length < 3) return [];
  const header = rows[0].split('|').map((cell) => cell.trim().toLowerCase()).filter(Boolean);
  const nameAt = header.findIndex((cell) => cell.includes('trial'));
  const difficultyAt = header.indexOf('difficulty');
  const locationAt = header.indexOf('location');
  if (nameAt < 0) return [];

  return rows.slice(2).map((row) => {
    const cells = row.split('|').map((cell) => cell.trim()).slice(1, -1);
    return {
      name: cells[nameAt] ?? '',
      district,
      difficulty: difficultyAt >= 0 ? cells[difficultyAt] ?? '' : '',
      location: locationAt >= 0 ? cells[locationAt] ?? '' : '',
    };
  }).filter((trial) => trial.name);
}

function splitLong(content) {
  if (content.length <= chunkLimit) return [content];

  const pieces = [];
  let current = '';
  const blocks = content.split(/\n\s*\n/);
  for (const block of blocks) {
    const lines = block.length > chunkLimit ? block.split('\n') : [block];
    const tableHead = /^\s*\|/.test(lines[0] ?? '') && /^\s*\|?\s*:?-{2,}/.test(lines[1] ?? '') ? `${lines[0]}\n${lines[1]}` : '';
    for (const line of lines) {
      const joiner = lines.length > 1 ? '\n' : '\n\n';
      if (current && current.length + joiner.length + line.length > chunkLimit) {
        pieces.push(current);
        current = tableHead && /^\s*\|/.test(line) && !line.includes('---') && line !== lines[0] ? `${tableHead}\n${line}` : line;
      } else {
        current = current ? `${current}${joiner}${line}` : line;
      }
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

// Splits a doc into one chunk per section, each starting with where it sits:
// "Gear › Grappler › Yank Grappler".
export function chunkDoc(doc) {
  const sections = [];
  let h2 = '';
  let h3 = '';
  let lines = [];

  const flush = () => {
    const content = lines.join('\n').trim();
    if (content) sections.push({ h2, h3, content });
    lines = [];
  };

  for (const raw of doc.body.split(/\r?\n/)) {
    const heading = raw.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flush();
      if (heading[1].length <= 2) {
        h2 = heading[2].trim();
        h3 = '';
      } else {
        h3 = heading[2].trim();
      }
      continue;
    }
    lines.push(raw);
  }
  flush();

  const chunks = [];
  for (const section of sections) {
    const path = [categoryLabel(doc.category), doc.title];
    if (section.h2 && section.h2.toLowerCase() !== doc.title.toLowerCase()) path.push(section.h2);
    if (section.h3) path.push(section.h3);
    const breadcrumb = path.join(' › ');
    const label = [section.h2, section.h3].filter(Boolean).join(' › ');

    for (const piece of splitLong(section.content)) {
      chunks.push({
        id: `${doc.id}#${chunks.length}`,
        doc: doc.id,
        title: doc.title,
        category: doc.category,
        section: label,
        breadcrumb,
        text: `${breadcrumb}\n${piece}`,
        aliases: doc.aliases,
        tags: doc.tags,
        questions: doc.questions,
      });
    }
  }

  if (!chunks.length) {
    chunks.push({
      id: `${doc.id}#0`,
      doc: doc.id,
      title: doc.title,
      category: doc.category,
      section: '',
      breadcrumb: `${categoryLabel(doc.category)} › ${doc.title}`,
      text: `${categoryLabel(doc.category)} › ${doc.title}\n${doc.summary}`,
      aliases: doc.aliases,
      tags: doc.tags,
      questions: doc.questions,
    });
  }
  return chunks;
}

export function readDoc(id, raw) {
  const { meta, body: original } = parseFrontmatter(raw);
  const category = text(meta.category) || id.split('/')[0];
  const { recipes, body } = category === 'crafting' ? extractRecipes(original) : { recipes: [], body: original };

  return {
    doc: {
      id,
      title: text(meta.title),
      category,
      summary: text(meta.summary) || autoSummary(body, text(meta.title)),
      aliases: list(meta.aliases),
      tags: list(meta.tags),
      questions: list(meta.questions),
      related: list(meta.related),
      updated: text(meta.updated),
      gameVersion: text(meta.game_version),
      body,
      // Length as written, before recipe lists are swapped for card notes.
      sourceChars: original.length,
    },
    recipes: recipes.map((recipe) => ({ ...recipe, doc: id })),
    hasOwnSummary: Boolean(text(meta.summary)),
  };
}

// Problems that break the build (errors) and ones worth knowing (warnings).
export function lintDocs(docs) {
  const errors = [];
  const warnings = [];
  const ids = new Set(docs.map((doc) => doc.id.replace(/\.md$/, '')));
  const titles = new Map();
  const aliasOwners = new Map();

  for (const doc of docs) {
    if (!doc.title) errors.push(`${doc.id}: missing title`);
    if (!doc.category) errors.push(`${doc.id}: missing category`);
    if (!doc.aliases.length) errors.push(`${doc.id}: needs at least one alias`);
    if (!doc.tags.length) errors.push(`${doc.id}: needs at least one tag`);
    if (doc.updated && !/^\d{4}-\d{2}-\d{2}$/.test(doc.updated)) errors.push(`${doc.id}: updated must look like 2026-11-04`);
    for (const link of doc.related) {
      if (!ids.has(link.replace(/\.md$/, ''))) errors.push(`${doc.id}: related link "${link}" does not exist`);
    }

    const title = doc.title.toLowerCase();
    if (titles.has(title)) errors.push(`${doc.id}: same title as ${titles.get(title)}`);
    titles.set(title, doc.id);

    for (const alias of doc.aliases) {
      const key = alias.toLowerCase();
      // Category and tag words are often repeated as aliases on purpose.
      if (key === doc.category || doc.tags.includes(key)) continue;
      aliasOwners.set(key, [...(aliasOwners.get(key) ?? []), doc.id]);
    }
  }

  const shared = Array.from(aliasOwners.entries()).filter(([, owners]) => owners.length > 1);
  if (shared.length) warnings.push(`${shared.length} aliases are used by more than one doc`);
  const stubs = docs.filter((doc) => (doc.sourceChars ?? doc.body.length) < stubChars);
  if (stubs.length) warnings.push(`${stubs.length} docs have under ${stubChars} characters of content`);

  return { errors, warnings, shared, stubs: stubs.map((doc) => doc.id) };
}

function walk(dir, root, files = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, root, files);
    else if (entry.name.endsWith('.md')) files.push({ id: relative(root, full).split(sep).join('/'), full });
  }
  return files;
}

export function buildKnowledge(root) {
  const files = walk(root, root).sort((a, b) => a.id.localeCompare(b.id));
  const docs = [];
  const recipes = [];
  const trials = [];
  const hash = createHash('sha1');

  for (const file of files) {
    const raw = readFileSync(file.full, 'utf8');
    hash.update(file.id).update(raw);
    const read = readDoc(file.id, raw);
    if (read.doc.category === 'index') continue;
    docs.push(read.doc);
    recipes.push(...read.recipes);
    const district = file.id.match(/^time-trials\/(downtown|dirwik|fragment|stack)-time-trials\.md$/)?.[1];
    if (district) trials.push(...extractTrials(read.doc.body, categoryLabel(district)));
  }

  const synonymsRaw = readFileSync(join(root, 'synonyms.json'), 'utf8');
  hash.update(synonymsRaw);
  const synonyms = JSON.parse(synonymsRaw).groups;

  return {
    version: 2,
    hash: hash.digest('hex').slice(0, 16),
    docs,
    chunks: docs.flatMap(chunkDoc),
    recipes,
    trials,
    synonyms,
    lint: lintDocs(docs),
  };
}

function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const repo = join(here, '..', '..');
  const verbose = process.argv.includes('--check');
  const { lint, ...kb } = buildKnowledge(join(repo, 'knowledge'));

  for (const error of lint.errors) console.error(`kb error: ${error}`);
  for (const warning of lint.warnings) console.warn(`kb warning: ${warning}`);
  if (verbose) {
    for (const [alias, owners] of lint.shared) console.warn(`  shared alias "${alias}": ${owners.join(', ')}`);
    for (const id of lint.stubs) console.warn(`  stub: ${id}`);
  }
  if (lint.errors.length) {
    process.exitCode = 1;
    return;
  }

  const out = join(repo, 'src', 'generated', 'kb.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(kb));
  console.log(`kb: ${kb.docs.length} docs, ${kb.chunks.length} chunks, ${kb.recipes.length} recipes, ${kb.trials.length} trials -> src/generated/kb.json`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
