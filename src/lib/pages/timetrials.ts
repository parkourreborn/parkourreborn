import { cleanPathPart } from '@/lib/url';

export type TimeTrial = {
  name: string;
  bronzeTime: string;
  silverTime: string;
  goldTime: string;
  platinumTime: string;
  videoURL: string;
  videoURL2: string;
  difficulty: string;
  district: string;
  sorting: number;
};

export type WorldRecord = {
  trialName: string;
  playerName: string;
  time: number;
  submissionUuid: string;
  playerScore: number | null;
};

type WrItem = {
  trial_name?: string;
  player_name?: string;
  time?: number;
  submission_uuid?: string;
  player_score?: number;
};

type WrResponse = {
  data?: WrItem[];
};

export const trialKey = (name: string) => name.trim().toLowerCase();

export const wrVideoURL = (submissionUuid: string) => {
  const id = cleanPathPart(submissionUuid);
  return id ? `https://assets.wasans.tully.sh/scores/${id}.mp4` : '';
};

export async function fetchTimeTrials(): Promise<TimeTrial[]> {
  const response = await fetch('/api/timetrials');
  if (!response.ok) throw new Error('Time trials API failed');

  const data = await response.json() as TimeTrial[];
  return Array.isArray(data) ? data : [];
}

export async function fetchWorldRecords(): Promise<Record<string, WorldRecord>> {
  const response = await fetch('/api/wrs');
  if (!response.ok) throw new Error('WR API failed');

  const data = await response.json() as WrResponse;
  const records: Record<string, WorldRecord> = {};

  for (const item of data.data ?? []) {
    if (!item.trial_name || typeof item.time !== 'number') continue;

    records[trialKey(item.trial_name)] = {
      trialName: item.trial_name,
      playerName: item.player_name ?? 'Unknown',
      time: item.time,
      submissionUuid: item.submission_uuid ?? '',
      playerScore: typeof item.player_score === 'number' ? item.player_score : null,
    };
  }

  return records;
}
