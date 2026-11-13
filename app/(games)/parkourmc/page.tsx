import type { Metadata } from 'next';
import ParkourMC from '@/components/games/parkourmc';
import HubPage from '@/components/hub-page';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Parkour MC',
  description: 'Join the Parkour Reborn Minecraft server.',
  alternates: { canonical: '/parkourmc' },
};

export default function Page() {
  return (
    <HubPage title="Parkour MC" image={images.backgrounds.games.parkourmc}>
      <ParkourMC />
    </HubPage>
  );
}
