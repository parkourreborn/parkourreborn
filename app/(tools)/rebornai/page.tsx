import type { Metadata } from 'next';
import HubPage from '@/components/hub-page';
import RebornAi from '@/components/tools/rebornai';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Reborn AI',
  description: 'Ask about PARKOUR Reborn techs, time trials, world records and community stuff.',
  alternates: { canonical: '/rebornai' },
};

export default function Page() {
  return (
    <HubPage title="Reborn AI" image={images.backgrounds.tools.rebornai}>
      <RebornAi />
    </HubPage>
  );
}
