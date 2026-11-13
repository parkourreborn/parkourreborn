import type { Metadata } from 'next';
import IncrementalParkour from '@/components/games/incrementalparkour';
import HubPage from '@/components/hub-page';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Incremental Parkour',
  description: 'Play PARKOUR Reborn 2d incremental game.',
  alternates: { canonical: '/incrementalparkour' },
};

export default function Page() {
  return (
    <HubPage title="Incremental Parkour" image={images.backgrounds.games.incrementalparkour}>
      <IncrementalParkour />
    </HubPage>
  );
}
