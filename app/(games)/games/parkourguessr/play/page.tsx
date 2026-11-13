import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import ParkourGuessrGame from '@/components/games/parkourguessr-game';
import { isGuessrDifficulty, isGuessrMode } from '@/lib/guessr';

export const metadata: Metadata = {
  title: 'Playing Parkour Guessr',
  description: 'Play Parkour Guessr.',
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string; difficulty?: string }> }) {
  const { mode = '', difficulty = '' } = await searchParams;
  if (!isGuessrMode(mode) || !isGuessrDifficulty(difficulty)) redirect('/games/parkourguessr?unavailable=invalid');
  return <ParkourGuessrGame mode={mode} difficulty={difficulty} />;
}
