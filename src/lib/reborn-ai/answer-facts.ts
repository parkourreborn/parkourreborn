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

export function versionDateQuestion(question: string) {
  const version = question.match(/\b\d+(?:\.\d+)+\b/)?.[0];
  if (!version || !/\b(when|date|release|released|came out|launch|launched)\b/i.test(question)) return null;
  if (/\b(?:and|also)\b|\?.*\w/.test(question)) return null;
  const stage = /\bpre[ -]?alpha\b/i.test(question) ? 'Pre-Alpha' : /\balpha\b/i.test(question) ? 'Alpha' : null;
  return { version, stage };
}

export function versionDateAnswer(question: string, timeline: string) {
  const asked = versionDateQuestion(question);
  if (!asked) return null;
  const rows = Array.from(timeline.matchAll(/^\|\s*(\d+(?:\.\d+)+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/gm))
    .filter((match) => match[1] === asked.version && (!asked.stage || (
      asked.stage === 'Pre-Alpha' ? match[3].trim() === 'Pre-Alpha' : match[3].trim().endsWith('Alpha') && match[3].trim() !== 'Pre-Alpha'
    )));
  if (!rows.length) return null;
  return rows.map((match) => `${match[3].trim()} ${asked.version} released on ${match[2].trim()}.`).join(' ');
}

export function simpleDefinitionTerm(question: string) {
  return question.trim().match(/^(?:what is|what's|define)\s+([a-z][a-z0-9 -]*?)[?.!\s]*$/i)?.[1]?.trim().toLowerCase() ?? null;
}

export function safeAnswer(reply: string, question: string, evidence: unknown) {
  const text = reply.trim();
  if (!text || text.length > 1200) return false;
  if (/\b(?:knowledge base|parkour reborn guide|retriev(?:al|ed)|api|tool calls?|system prompt|supplied json|evidence|context window)\b/i.test(text)) return false;
  const numbers = (value: string) => Array.from(value.matchAll(/\b\d+(?:\.\d+)?\b/g), (match) => match[0]);
  const allowed = new Set(numbers(`${question}\n${JSON.stringify(evidence)}`));
  return numbers(text).every((number) => allowed.has(number));
}
