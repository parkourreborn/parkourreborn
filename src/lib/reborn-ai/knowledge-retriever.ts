import 'server-only';

import { readFile, readdir } from 'fs/promises';
import { join, relative, sep } from 'path';
import Fuse from 'fuse.js';
import { limits } from '@/lib/reborn-ai/limits';
import type { KnowledgeDoc, KnowledgeResult, KnowledgeRetriever } from '@/lib/reborn-ai/types';

type Meta = Record<string, string | string[]>;

const root = join(process.cwd(), 'knowledge');

const stopWords = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'best', 'but', 'can', 'do', 'does', 'explain',
  'for', 'from', 'get', 'give', 'good', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'need', 'of',
  'on', 'or', 'pls', 'please', 'so', 'tell', 'that', 'the', 'their', 'them', 'there', 'this', 'to', 'use',
  'using', 'want', 'was', 'what', 'whats', 'when', 'where', 'which', 'why', 'with', 'work', 'working',
  'works', 'you', 'your',
]);

const fuseOptions = {
  includeScore: true,
  ignoreLocation: true,
  threshold: 0.42,
  minMatchCharLength: 3,
  keys: [
    { name: 'title', weight: 0.45 },
    { name: 'aliases', weight: 0.3 },
    { name: 'tags', weight: 0.15 },
    { name: 'body', weight: 0.1 },
  ],
};

const unquote = (value: string) => value.trim().replace(/^['"]|['"]$/g, '').trim();

const asList = (value: string | string[] | undefined) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
};

const asText = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] ?? '' : value ?? '');

function inlineList(value: string) {
  return value
    .slice(1, -1)
    .split(',')
    .map(unquote)
    .filter(Boolean);
}

function parseFrontmatter(raw: string) {
  const head = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!head) return { meta: {} as Meta, body: raw.trim() };

  const meta: Meta = {};
  let key = '';

  for (const line of head[1].split(/\r?\n/)) {
    const item = line.match(/^\s*-\s+(.*)$/);
    if (item) {
      const current = meta[key];
      if (Array.isArray(current)) current.push(unquote(item[1]));
      continue;
    }

    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) continue;

    key = pair[1];
    const value = pair[2].trim();

    if (!value) meta[key] = [];
    else if (value.startsWith('[')) meta[key] = inlineList(value);
    else meta[key] = unquote(value);
  }

  return { meta, body: raw.slice(head[0].length).trim() };
}

function toDoc(id: string, raw: string): KnowledgeDoc {
  const { meta, body } = parseFrontmatter(raw);
  const fallback = id.split('/').pop()?.replace(/\.md$/, '').replace(/-/g, ' ') ?? id;

  return {
    id,
    title: asText(meta.title) || fallback,
    category: asText(meta.category) || id.split('/')[0] || 'general',
    aliases: asList(meta.aliases),
    tags: asList(meta.tags),
    body,
  };
}

async function loadDocs(): Promise<KnowledgeDoc[]> {
  const names = await readdir(root, { recursive: true, withFileTypes: true });
  const files = names.filter((entry) => entry.isFile() && entry.name.endsWith('.md'));

  const docs = await Promise.all(files.map(async (entry) => {
    const full = join(entry.parentPath ?? entry.path ?? root, entry.name);
    const id = relative(root, full).split(sep).join('/');
    return toDoc(id, await readFile(full, 'utf8'));
  }));

  return docs.sort((a, b) => a.id.localeCompare(b.id));
}

function tokenize(query: string) {
  return Array.from(new Set(
    query
      .toLowerCase()
      .match(/\b\d+(?:\.\d+)+\b|[a-z][a-z0-9-]*/g)?.filter((word) => (word.length >= 3 || /^\d+(?:\.\d+)+$/.test(word)) && !stopWords.has(word)) ?? [],
  )).slice(0, 8);
}

const haystack = (doc: KnowledgeDoc) => `${doc.title} ${doc.aliases.join(' ')} ${doc.tags.join(' ')} ${doc.body}`.toLowerCase();

type Index = {
  fuse: Fuse<KnowledgeDoc>;
  docs: KnowledgeDoc[];
};

class LocalKnowledgeRetriever implements KnowledgeRetriever {
  private cache: Promise<Index> | null = null;

  private index() {
    if (!this.cache) {
      this.cache = loadDocs()
        .then((docs) => {
          const searchable = docs.filter((doc) => doc.category !== 'index');
          return { fuse: new Fuse(searchable, fuseOptions), docs: searchable };
        })
        .catch((error) => {
          this.cache = null;
          throw error;
        });
    }

    return this.cache;
  }

  async docs(): Promise<KnowledgeDoc[]> {
    try {
      return (await this.index()).docs;
    } catch {
      return [];
    }
  }

  async search(query: string, limit = limits.maxKnowledgeDocs): Promise<KnowledgeResult[]> {
    const clean = query.trim();
    if (!clean) return [];

    let index: Index;
    try {
      index = await this.index();
    } catch {
      return [];
    }

    const { fuse } = index;
    const tokens = tokenize(clean);
    const weights = new Map<string, { doc: KnowledgeDoc; score: number }>();

    const collect = (results: ReturnType<typeof fuse.search>, boost: number) => {
      for (const result of results) {
        const hit = weights.get(result.item.id) ?? { doc: result.item, score: 0 };
        hit.score += (1 - (result.score ?? 1)) * boost;
        weights.set(result.item.id, hit);
      }
    };

    collect(fuse.search(clean, { limit: limit * 3 }), 1.5);
    for (const token of tokens) collect(fuse.search(token, { limit: limit * 3 }), 1);

    for (const doc of index.docs) {
      const hay = haystack(doc);
      const exact = tokens.filter((token) => hay.includes(token)).length;
      if (!exact) continue;

      const hit = weights.get(doc.id) ?? { doc, score: 0 };
      hit.score += exact * 0.8;
      const names = [doc.title, ...doc.aliases].map((name) => name.toLowerCase());
      if (names.some((name) => name.length >= 3 && (clean.toLowerCase() === name || clean.toLowerCase().includes(name)))) hit.score += 6;
      if (doc.title === 'Update Timeline' && tokens.some((token) => /^\d+(?:\.\d+)+$/.test(token))) hit.score += 6;
      weights.set(doc.id, hit);
    }

    return Array.from(weights.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ doc, score }) => ({ doc, score: Number(score.toFixed(3)) }));
  }
}

export const knowledgeRetriever: KnowledgeRetriever = new LocalKnowledgeRetriever();
