export const limits = {
  maxBodyBytes: 256 * 1024,
  maxHistory: 20,
  // Turns older than this many still go to the model, but shortened.
  fullHistoryTurns: 12,
  olderTurnChars: 240,
  maxMessageChars: 4000,
  maxKnowledgeDocs: 10,
  maxKnowledgeChars: 40000,
  maxToolResultItems: 25,
  // Visible answer budget. Models that cannot switch reasoning off get
  // reasoningTokens on top so their thinking never eats the reply.
  maxOutputTokens: 2000,
  reasoningTokens: 3000,
  maxAutoBlocks: 12,
  maxBlocks: 12,
  toolTimeoutMs: 12000,
  routerTimeoutMs: 1500,
  // How long a model gets to send its first word before the next one is tried.
  firstTokenMs: 15000,
  reasoningFirstTokenMs: 45000,
  modelIdleMs: 20000,
  // Total time one answer may spend waiting out OpenRouter's per-minute limit.
  queueWaitMs: 45000,
  // Total time one answer may spend going through the model list.
  answerBudgetMs: 150000,
  heartbeatMs: 10000,
  dataCacheMs: 60000,
  catalogCacheMs: 60 * 60 * 1000,
  quotaCacheMs: 60000,
} as const;

// Answers per person. Logged-in players are counted by Discord account, so a
// shared school or household connection does not lock everyone out; anyone
// else is counted by IP. When fewer than lowQuotaBelow free OpenRouter
// requests are left for the day, everyone's limits are halved so the rest
// of the day's quota is shared out.
export const rateLimits = {
  user: { perMinute: 20, perHour: 200, perDay: 400 },
  anonymous: { perMinute: 10, perHour: 100 },
  // Requests per IP per minute before any work is done, whoever is asking.
  flood: 40,
  lowQuotaBelow: 100,
} as const;
