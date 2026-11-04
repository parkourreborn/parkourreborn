// Pure text helpers for streaming answers. No server-only imports so they can
// be unit tested with plain node.

const marker = /\[\[\s*cards?\s*:\s*([\d,\s]*)\]\]/gi;

// The model ends its answer with [[cards:0,2]]. While streaming, nothing from
// the first "[[" on is shown, so a half written marker never flashes up.
export function visibleEnd(text: string) {
  const open = text.indexOf('[[');
  if (open >= 0) return open;
  return text.endsWith('[') ? text.length - 1 : text.length;
}

export function splitCards(text: string) {
  const indexes: number[] = [];
  const clean = text
    .replace(marker, (_, list: string) => {
      for (const part of list.split(',')) {
        const index = Number(part.trim());
        if (part.trim() && Number.isInteger(index) && index >= 0) indexes.push(index);
      }
      return '';
    })
    .replace(/\[\[[^\]]*\]?$/, '')
    .trimEnd();

  return { text: clean, indexes: Array.from(new Set(indexes)) };
}

// Feeds model output to the user as it arrives and settles the card marker at
// the end. finish() sends whatever was held back and returns the full answer.
export function answerStream(show: (delta: string) => void) {
  let full = '';
  let shown = 0;

  return {
    push(delta: string) {
      full += delta;
      const end = visibleEnd(full);
      if (end > shown) {
        show(full.slice(shown, end));
        shown = end;
      }
    },
    finish() {
      const { text, indexes } = splitCards(full);
      if (text.length > shown) show(text.slice(shown));
      shown = Math.max(shown, text.length);
      return { answer: text.trim(), indexes };
    },
    get raw() {
      return full;
    },
  };
}

// Markdown out of a knowledge doc, made readable as plain chat text: headings
// lose their #, bullets become dots, and table rows become "a · b · c".
export function plainExcerpt(body: string, max: number) {
  const lines = body
    .split(/\r?\n/)
    .filter((line) => !/^\s*\|?\s*:?-{2,}/.test(line))
    .map((line) => line
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*[*-]\s+/, '• ')
      .replace(/^\s*\|(.*)\|\s*$/, (_, row: string) => row.split('|').map((cell) => cell.trim()).filter(Boolean).join(' · '))
      .trim())
    .filter(Boolean);

  let text = '';
  for (const line of lines) {
    const next = text ? `${text}\n${line}` : line;
    if (next.length > max) break;
    text = next;
  }
  if (!text && lines[0]) text = `${lines[0].slice(0, max).replace(/\s+\S*$/, '')}…`;
  return text;
}

type Fact = { result: unknown };
type KnowledgeHit = { title: string; body: string };

function knowledgeHit(value: unknown): value is KnowledgeHit {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.title === 'string' && typeof item.body === 'string' && item.body.trim().length > 0;
}

const rescueIntro = {
  quota: 'reborn ai has used up its free answers for today, but here is what i found in the game data:',
  busy: 'the ai models are all busy right now, but here is what i found in the game data:',
  other: 'reborn ai could not write an answer right now, but here is what i found in the game data:',
} as const;

export type RescueReason = keyof typeof rescueIntro;

// When no model can answer, the facts already looked up are still worth
// showing: the best guide section as text, with the cards under it.
export function rescueText(facts: Fact[], reason: RescueReason, hasCards: boolean) {
  const hit = facts.flatMap((fact) => (Array.isArray(fact.result) ? fact.result : [])).find(knowledgeHit);
  // Chunks start with a "Gear › Grappler › …" breadcrumb; the title is shown instead.
  const excerpt = hit ? plainExcerpt(hit.body.replace(/^[^\n]*›[^\n]*\n/, ''), 900) : '';
  if (!excerpt && !hasCards) return null;
  return excerpt ? `${rescueIntro[reason]}\n\n**${hit?.title}**\n${excerpt}` : rescueIntro[reason];
}
