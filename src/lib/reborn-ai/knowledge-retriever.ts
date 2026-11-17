import 'server-only';

import kb from '@/generated/kb.json';
import { createKnowledgeSearch } from '@/lib/reborn-ai/kb-search';
import type { KnowledgeBase } from '@/lib/reborn-ai/kb-search';
import { createMovementModel } from '@/lib/reborn-ai/movement-model';

// Built by scripts/kb/build.mjs (runs before dev, build and typecheck).
export const knowledge = createKnowledgeSearch(kb as KnowledgeBase);
export const movement = createMovementModel(knowledge.moves);
