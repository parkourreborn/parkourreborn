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

export function safeAnswer(reply: string, question: string, evidence: unknown) {
  const text = reply.trim();
  if (!text || text.length > 1200) return false;
  if (/\b(?:knowledge base|parkour reborn guide|retriev(?:al|ed)|api|tool calls?|system prompt|supplied json|evidence|context window)\b/i.test(text)) return false;
  const numbers = (value: string) => Array.from(value.matchAll(/\b\d+(?:\.\d+)?\b/g), (match) => match[0]);
  const allowed = new Set(numbers(`${question}\n${JSON.stringify(evidence)}`));
  return numbers(text).every((number) => allowed.has(number));
}
