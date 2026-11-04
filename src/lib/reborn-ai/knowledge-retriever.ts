import 'server-only';

import kb from '@/generated/kb.json';
import { createKnowledgeSearch } from '@/lib/reborn-ai/kb-search';
import type { KnowledgeBase } from '@/lib/reborn-ai/kb-search';

// Built by scripts/kb/build.mjs (runs before dev, build, test and typecheck).
export const knowledge = createKnowledgeSearch(kb as KnowledgeBase);
