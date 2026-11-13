import type { Metadata } from 'next';
import ComingSoon from '@/components/coming-soon';
import HubPage from '@/components/hub-page';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Bag Opening Simulator',
  description: 'PARKOUR Reborn bag opening simulator.',
  alternates: { canonical: '/bagopensimulator' },
};

export default function Page() {
  return (
    <HubPage title="Bag Opening Simulator" image={images.backgrounds.games.bagopensimulator}>
      <ComingSoon />
    </HubPage>
  );
}
