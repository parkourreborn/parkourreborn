// Keyword search over the prebuilt knowledge chunks (src/generated/kb.json).

import MiniSearch from 'minisearch';

export type KbDoc = {
  id: string;
  title: string;
  category: string;
  summary: string;
  aliases: string[];
  tags: string[];
  questions: string[];
  related: string[];
  updated: string;
  gameVersion: string;
  body: string;
  sourceChars?: number;
};

export type KbChunk = {
  id: string;
  doc: string;
  title: string;
  category: string;
  section: string;
  breadcrumb: string;
  text: string;
  aliases: string[];
  tags: string[];
  questions: string[];
};

export type KbRecipe = { item: string; doc: string; middle: string; items: { name: string; quantity: number }[] };
export type KbTrial = { name: string; district: string; difficulty: string; location: string };

export type KnowledgeBase = {
  version: number;
  hash: string;
  docs: KbDoc[];
  chunks: KbChunk[];
  recipes: KbRecipe[];
  trials: KbTrial[];
  synonyms: string[][];
};

export type ChunkHit = { chunk: KbChunk; score: number };

const stopWords = new Set([
  'a', 'about', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'best', 'but', 'by', 'can', 'could', 'do', 'does',
  'explain', 'for', 'from', 'get', 'give', 'good', 'how', 'i', 'if', 'in', 'is', 'it', 'its', 'me', 'my', 'need',
  'of', 'on', 'or', 'pls', 'please', 'so', 'tell', 'that', 'the', 'their', 'them', 'there', 'this', 'to', 'use',
  'using', 'want', 'was', 'what', 'whats', 'when', 'where', 'which', 'who', 'why', 'with', 'work', 'working',
  'works', 'you', 'your', 'u', 'ur', 'im', 'game', 'parkour', 'reborn', 'did', 'done', 'come', 'came', 'out',
  'go', 'goes', 'going', 'got', 'gets', 'much', 'many', 'really', 'just', 'like', 'some', 'would', 'should',
  'have', 'has', 'had', 'been', 'were', 'will', 'here', 'then', 'than', 'also', 'too', 'very', 'know', 'there',
  'thing', 'things', 'stuff', 'someone', 'anyone', 'guys', 'yo', 'hey', 'bro', 'actually', 'exactly',
]);

const tokenPattern = /\d+(?:\.\d+)+|[\p{L}\p{N}]+/gu;

export function tokenize(text: string) {
  return text.toLowerCase().match(tokenPattern) ?? [];
}

// " wr on crystal " -> padded, lowercase, punctuation as spaces, so phrases
// can be looked up with includes(` ${phrase} `).
export function padded(text: string) {
  return ` ${tokenize(text).join(' ')} `;
}

// Adds every word of a synonym group whose member appears in the query.
function expandQuery(query: string, groups: string[][]) {
  const haystack = padded(query);
  const extra = new Set<string>();
  for (const group of groups) {
    if (group.some((word) => haystack.includes(padded(word)))) {
      for (const word of group) if (!haystack.includes(padded(word))) extra.add(word);
    }
  }
  return Array.from(extra).join(' ');
}

const versionPattern = /\b\d+(?:\.\d+)+\b/g;

// For "when did 1.73 come out", keep only the timeline rows for that version.
export function focusVersions(text: string, query: string) {
  const versions = query.match(versionPattern);
  if (!versions || !text.includes('|')) return text;
  const lines = text.split('\n');
  const rows = lines.filter((line) => versions.some((version) => new RegExp(`^\\|\\s*${version.replace(/\./g, '\\.')}\\s*\\|`).test(line)));
  if (!rows.length) return text;
  const head = lines.filter((line) => !line.startsWith('|'));
  const tableHead = lines.filter((line) => line.startsWith('|')).slice(0, 2);
  return [...head, ...tableHead, ...rows].join('\n');
}

const numerals: Record<string, string> = { 1: 'i', 2: 'ii', 3: 'iii', one: 'i', two: 'ii', three: 'iii' };
const numeralWords = new Set(['i', 'ii', 'iii']);

function recipeWords(text: string) {
  return tokenize(text).map((word) => numerals[word] ?? word);
}

// Which recipes a question is about. "yank grappler 2" -> Yank Grappler II,
// "grappler recipe" -> Base Grappler, "yank grappler" -> both Yank tiers.
export function matchRecipes(query: string, recipes: KbRecipe[]) {
  const asked = recipeWords(query);
  const askedText = ` ${asked.join(' ')} `;
  const askedSet = new Set(asked.filter((word) => !numeralWords.has(word)));

  const exact = recipes.filter((recipe) => askedText.includes(` ${recipeWords(recipe.item).join(' ')} `));
  if (exact.length) {
    const longest = Math.max(...exact.map((recipe) => recipe.item.length));
    return exact.filter((recipe) => recipe.item.length === longest);
  }

  const scored = recipes.map((recipe) => {
    const words = recipeWords(recipe.item).filter((word) => !numeralWords.has(word));
    const matched = words.filter((word) => askedSet.has(word)).length;
    return { recipe, matched, extra: words.length - matched, gearNamed: askedSet.has(words[words.length - 1]) };
  }).filter((entry) => entry.matched > 0 && entry.gearNamed);
  if (!scored.length) return [];

  const most = Math.max(...scored.map((entry) => entry.matched));
  const top = scored.filter((entry) => entry.matched === most);
  const fewest = Math.min(...top.map((entry) => entry.extra));
  const best = top.filter((entry) => entry.extra === fewest).map((entry) => entry.recipe);
  // Naming only the gear ("grappler recipe") means its base version.
  const base = best.filter((recipe) => /^base\s/i.test(recipe.item));
  return base.length ? base : best;
}

const boosts = { title: 4, aliases: 4, section: 2.5, questions: 2, tags: 1.2, text: 1 };

export function createKnowledgeSearch(kb: KnowledgeBase) {
  let index: MiniSearch<KbChunk> | null = null;
  const docs = new Map(kb.docs.map((doc) => [doc.id, doc]));
  const names = new Map(kb.docs.map((doc) => [doc.id, [doc.title, ...doc.aliases].map(padded).filter((name) => name.trim().length >= 3)]));

  function ready() {
    if (index) return index;
    index = new MiniSearch<KbChunk>({
      fields: ['title', 'aliases', 'section', 'questions', 'tags', 'text'],
      idField: 'id',
      tokenize,
      processTerm: (term) => (stopWords.has(term) ? null : term),
      extractField: (chunk, field) => {
        const value = (chunk as unknown as Record<string, unknown>)[field];
        return Array.isArray(value) ? value.join(' ') : String(value ?? '');
      },
      searchOptions: {
        boost: boosts,
        prefix: (term) => term.length >= 4,
        fuzzy: (term) => (term.length >= 6 ? 0.2 : false),
        combineWith: 'OR',
      },
    });
    index.addAll(kb.chunks);
    return index;
  }

  const byId = new Map(kb.chunks.map((chunk) => [chunk.id, chunk]));

  // Best chunks for a question: keyword search on the question, a weaker
  // search on its synonyms, then a boost for chunks whose doc or section the
  // question names outright.
  function search(query: string, limit = 10, perDoc = 4): ChunkHit[] {
    const clean = query.trim();
    if (!clean) return [];
    const engine = ready();
    const scores = new Map<string, number>();

    for (const result of engine.search(clean)) scores.set(String(result.id), result.score);
    const extra = expandQuery(clean, kb.synonyms);
    if (extra) {
      for (const result of engine.search(extra)) {
        const id = String(result.id);
        scores.set(id, (scores.get(id) ?? 0) + result.score * 0.6);
      }
    }

    const asked = padded(clean);
    const versions = clean.match(versionPattern) ?? [];
    const hits: ChunkHit[] = [];
    for (const [id, base] of scores) {
      const chunk = byId.get(id);
      if (!chunk) continue;
      let score = base;
      const named = (names.get(chunk.doc) ?? []).filter((name) => asked.includes(name));
      if (named.length) score *= 1.4 + Math.min(0.6, 0.2 * Math.max(...named.map((name) => name.trim().split(' ').length)));
      const section = chunk.section.split(' › ').pop() ?? '';
      if (section && asked.includes(padded(section))) score *= 1.4;
      for (const version of versions) {
        const escaped = version.replace(/\./g, '\\.');
        // A table row keyed by the version (the update timeline) beats a
        // passing "added in 1.73".
        if (new RegExp(`^\\|\\s*${escaped}\\s*\\|`, 'm').test(chunk.text)) score *= 12;
        else if (new RegExp(`(?<![\\d.])${escaped}(?![\\d.])`).test(chunk.text)) score *= 2;
      }
      hits.push({ chunk, score });
    }

    hits.sort((a, b) => b.score - a.score);
    const taken = new Map<string, number>();
    const picked: ChunkHit[] = [];
    for (const hit of hits) {
      const used = taken.get(hit.chunk.doc) ?? 0;
      if (used >= perDoc) continue;
      taken.set(hit.chunk.doc, used + 1);
      picked.push(hit);
      if (picked.length >= limit) break;
    }
    return picked;
  }

  // A doc's chunks, the ones matching the query first.
  function chunksOf(docId: string, query = '') {
    const own = kb.chunks.filter((chunk) => chunk.doc === docId);
    if (!query.trim()) return own;
    const order = new Map(search(query, 60, 60).filter((hit) => hit.chunk.doc === docId).map((hit, index) => [hit.chunk.id, index]));
    return [...own].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
  }

  // Every doc in full, for the rare question nothing narrower could answer.
  function fullText() {
    return kb.docs.map((doc) => `# ${doc.title} (${doc.category})\n${doc.body}`).join('\n\n');
  }

  return {
    hash: kb.hash,
    search,
    chunksOf,
    fullText,
    doc: (id: string) => docs.get(id),
    docs: kb.docs,
    recipes: kb.recipes,
    trials: kb.trials,
    synonyms: kb.synonyms,
  };
}
