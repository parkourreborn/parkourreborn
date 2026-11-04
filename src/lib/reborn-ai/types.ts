import type { MovementKind } from '@/lib/pages/techlist';

export type ChatRole = 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type RecipeItem = {
  name: string;
  quantity: number;
};

export type RecipeSlot = {
  name: string;
  image: string;
};

export type AssistantBlock =
  | { type: 'text'; content: string }
  | { type: 'link'; title: string; url: string }
  | { type: 'video'; url: string; title?: string }
  | { type: 'image'; url: string; alt?: string }
  | { type: 'gif'; url: string; title?: string }
  | {
      type: 'tech';
      name: string;
      kind: MovementKind;
      aliases: string[];
      steps: string[];
      videoUrl: string;
      tutorialUrl: string;
    }
  | {
      type: 'time_trial';
      name: string;
      district: string;
      difficulty: string;
      bronze: string;
      silver: string;
      gold: string;
      platinum: string;
      videoUrl: string;
    }
  | {
      type: 'world_record';
      trial: string;
      player: string;
      time: string;
      wasansScore: string;
      submissionUrl: string;
      videoUrl: string;
    }
  | {
      type: 'recipe';
      item: string;
      middle: RecipeSlot;
      slots: RecipeSlot[];
    };

export type AssistantStatus = 'thinking' | 'looking' | 'writing' | 'queued';

export type ChatEvent =
  | { type: 'status'; state: AssistantStatus }
  | { type: 'text'; delta: string }
  // Drop the text streamed so far, a rewritten answer follows.
  | { type: 'reset' }
  | { type: 'blocks'; blocks: AssistantBlock[] }
  | { type: 'error'; message: string; retryable?: boolean }
  | { type: 'done' };
