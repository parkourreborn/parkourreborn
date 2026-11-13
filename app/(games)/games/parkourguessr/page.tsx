import type { Metadata } from 'next';
import ParkourGuessrSelect from '@/components/games/parkourguessr-select';
import HubPage from '@/components/hub-page';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Parkour Guessr',
  description: 'Play Parkour Reborn geoguessr.',
  alternates: { canonical: '/games/parkourguessr' },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ unavailable?: string }> }) {
  const params = await searchParams;

  return (
    <HubPage title="Parkour Guessr" image={images.backgrounds.games.parkourguessr}>
      <ParkourGuessrSelect notice={params.unavailable === 'invalid' ? 'Pick a mode and difficulty before starting.' : ''} />
    </HubPage>
  );
}
