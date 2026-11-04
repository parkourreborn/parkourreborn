import 'server-only';

import { z } from 'zod';

// Client for Jev (TypeSafe's System One model, https://docs.typesafe.ai).
// Jev answers typed questions about a state with calibrated probabilities:
//   noul   - yes/no, answer.noul is the chance of yes (0-1)
//   choice - pick one option, answer.choice plus probabilities and confidence
//   score  - place on an ordered scale, answer.score between 0 and the top level
// All questions in one call run in parallel, so batching is nearly free.
// Every caller must cope with null: no key, a timeout, or a bad reply.

export type JevQuestion =
  | { type: 'noul'; instructions: string; criteria?: { yes: string; no: string } }
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] };

const answerSchema = z.object({
  noul: z.number().min(0).max(1).optional(),
  choice: z.string().optional(),
  score: z.number().optional(),
  confidence: z.number().min(0).max(1).optional(),
  probabilities: z.record(z.string(), z.number()).optional(),
}).passthrough();

const responseSchema = z.object({
  model: z.string().optional(),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }).partial().optional(),
  answers: z.record(z.string(), answerSchema),
});

export type JevAnswer = z.infer<typeof answerSchema>;
export type JevReply = {
  model: string;
  usage?: { inputTokens?: number; outputTokens?: number };
  answers: Record<string, JevAnswer>;
  ms: number;
};

const endpoint = 'https://api.typesafe.ai/v1/systemone';

export function hasJev() {
  return Boolean(process.env.TYPESAFE_API_KEY?.trim());
}

function envNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export async function askJev(
  state: unknown,
  questions: Record<string, JevQuestion>,
  { timeoutMs = 1500, signal }: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<JevReply | null> {
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey || !Object.keys(questions).length) return null;

  const timeout = AbortSignal.timeout(envNumber('JEV_TIMEOUT_MS', timeoutMs));
  const started = Date.now();
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      body: JSON.stringify({ model: process.env.JEV_MODEL?.trim() || 'jev-latest', state, questions }),
    });
    if (!response.ok) {
      console.warn('reborn-ai jev call failed', { status: response.status, questions: Object.keys(questions).length });
      return null;
    }
    const parsed = responseSchema.safeParse(await response.json());
    if (!parsed.success) return null;
    return {
      model: parsed.data.model ?? '',
      usage: parsed.data.usage ? { inputTokens: parsed.data.usage.input_tokens, outputTokens: parsed.data.usage.output_tokens } : undefined,
      answers: parsed.data.answers,
      ms: Date.now() - started,
    };
  } catch {
    return null;
  }
}

export const yes = (reply: JevReply | null, id: string) => reply?.answers[id]?.noul ?? null;
