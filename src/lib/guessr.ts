export const guessrModes = ['classic', 'graffiti'] as const;
export const guessrDifficulties = ['normal', 'hard'] as const;

export type GuessrMode = typeof guessrModes[number];
export type GuessrDifficulty = typeof guessrDifficulties[number];
export type MapPoint = { x: number; y: number };

export type GuessrMap = {
  id: string;
  url: string;
  width: number;
  height: number;
};

export type GuessrAvailability = {
  mode: GuessrMode;
  difficulty: GuessrDifficulty;
  count: number;
  available: boolean;
};

export type GuessrConfig = {
  map: GuessrMap;
  availability: GuessrAvailability[];
};

export type GuessrRound = {
  id: string;
  imageUrl: string;
};

export type GuessrGame = {
  gameId: string;
  mode: GuessrMode;
  difficulty: GuessrDifficulty;
  mapVersionId: string;
  roundCount: number;
  rounds: GuessrRound[];
};

export type GuessrGameResult = {
  gameId: string;
  mode: GuessrMode;
  difficulty: GuessrDifficulty;
  mapVersionId: string;
  roundCount: number;
  totalScore: number;
  duration: number;
};

export type GuessrRoundResult = {
  round: number;
  roundCount: number;
  target: MapPoint;
  distance: number;
  score: number;
  totalScore: number;
  complete: boolean;
  game: GuessrGameResult | null;
};

export const isGuessrMode = (value: string): value is GuessrMode => guessrModes.includes(value as GuessrMode);
export const isGuessrDifficulty = (value: string): value is GuessrDifficulty => guessrDifficulties.includes(value as GuessrDifficulty);
