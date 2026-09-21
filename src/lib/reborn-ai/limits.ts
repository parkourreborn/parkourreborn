export const limits = {
  maxBodyBytes: 64 * 1024,
  maxHistory: 10,
  maxMessageChars: 1400,
  maxModelRetries: 1,
  maxKnowledgeDocs: 4,
  maxKnowledgeChars: 8000,
  maxToolResultItems: 25,
  maxOutputTokens: 1200,
  maxAutoBlocks: 9,
  maxBlocks: 9,
  toolTimeoutMs: 12000,
  routerTimeoutMs: 1200,
  modelConnectMs: 30000,
  modelIdleMs: 45000,
  heartbeatMs: 10000,
  dataCacheMs: 60000,
} as const;

export const rateLimits = {
  perMinute: 8,
  perHour: 60,
} as const;
