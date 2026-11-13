import type { Metadata } from 'next';
import ComingSoon from '@/components/coming-soon';
import HubPage from '@/components/hub-page';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Contributions',
  description: 'Parkour Reborn Hub contributions.',
  alternates: { canonical: '/contributions' },
};

export default function Page() {
  return (
    <HubPage title="Contributions" image={images.backgrounds.community.contributions}>
      <ComingSoon />
    </HubPage>
  );
}
