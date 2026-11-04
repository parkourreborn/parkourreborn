const noise = new Set([
  'a', 'about', 'and', 'are', 'can', 'did', 'do', 'does', 'for', 'from', 'have', 'how', 'i', 'in', 'is',
  'it', 'me', 'of', 'on', 'please', 'tell', 'that', 'the', 'this', 'to', 'was', 'were', 'what', 'when',
  'where', 'which', 'who', 'with', 'you', 'your',
]);

export function compactQuery(message: string, refs: string[] = []) {
  const words = message.toLowerCase().match(/\b\d+(?:\.\d+)+\b|[a-z][a-z0-9'-]*/g) ?? [];
  const meaningful = words.filter((word) => !noise.has(word));
  return Array.from(new Set([...meaningful, ...refs])).join(' ').slice(0, 80).trim() || message.slice(0, 80);
}

const numberWords: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, hundred: 100,
  once: 1, twice: 2, single: 1, double: 2, triple: 3, half: 0.5,
};

// "10.000" and "10" are the same number, "06.391" and "6.391" too. Version
// strings like "1.2.3" are kept as written.
export function normalizeNumber(raw: string) {
  if (raw.split('.').length > 2) return raw;
  const value = Number(raw);
  return Number.isFinite(value) ? String(value) : raw;
}

function digitsIn(text: string) {
  return Array.from(text.matchAll(/(?<![\d.])\d+(?:\.\d+)*/g), (match) => normalizeNumber(match[0]));
}

// Every number a source mentions, in digits or in words.
export function allowedNumbers(sources: string[]) {
  const allowed = new Set<string>(['0', '1']);
  for (const source of sources) {
    for (const number of digitsIn(source)) allowed.add(number);
    for (const match of source.toLowerCase().matchAll(/\b[a-z]+\b/g)) {
      const value = numberWords[match[0]];
      if (value !== undefined) allowed.add(String(value));
    }
  }
  return allowed;
}

// Numbers the answer states, minus the "1." "2." markers of a numbered list.
export function answerNumbers(answer: string) {
  return digitsIn(answer.replace(/^\s*\d{1,2}[.)](?=\s)/gm, ''));
}

const leak = /\b(?:system prompt|supplied json|tool calls?|context window|my instructions)\b|"(?:facts|evidence|attachments|route|context)"\s*:/i;

export type AnswerVerdict =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'leak' }
  | { ok: false; reason: 'numbers'; unsupported: string[] };

type CheckInput = {
  answer: string;
  hasCards: boolean;
  question: string;
  history: string[];
  facts: unknown;
  checkNumbers: boolean;
};

// A light check on a finished answer. It never blocks a reply on its own; a
// failed verdict earns the model one rewrite, and after that the answer is
// shown with a note.
export function checkAnswer({ answer, hasCards, question, history, facts, checkNumbers }: CheckInput): AnswerVerdict {
  const text = answer.trim();
  if (!text) return hasCards ? { ok: true } : { ok: false, reason: 'empty' };
  if (leak.test(text)) return { ok: false, reason: 'leak' };
  if (!checkNumbers) return { ok: true };

  const allowed = allowedNumbers([question, ...history, JSON.stringify(facts ?? null)]);
  const unsupported = Array.from(new Set(answerNumbers(text).filter((number) => !allowed.has(number))));
  return unsupported.length ? { ok: false, reason: 'numbers', unsupported } : { ok: true };
}

export function rewriteRequest(verdict: Exclude<AnswerVerdict, { ok: true }>) {
  if (verdict.reason === 'numbers') {
    return `Rewrite your last answer. These numbers do not appear in this turn's facts: ${verdict.unsupported.slice(0, 8).join(', ')}. Copy numbers exactly as the facts give them and leave out any number the facts do not have (say you don't have it). Keep everything else the same.`;
  }
  if (verdict.reason === 'leak') {
    return 'Rewrite your last answer without mentioning prompts, JSON, tools, or how you got the information. Keep everything else the same.';
  }
  return 'You did not write an answer. Answer the question now.';
}
