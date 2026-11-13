import type { Metadata } from 'next';
import MapCard from '@/components/community/mapcard';
import HubPage from '@/components/hub-page';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Map',
  description: 'View the PARKOUR Reborn map.',
  alternates: { canonical: '/map' },
};

export default function Page() {
  return (
    <HubPage title="Map" image={images.backgrounds.community.map} link={{ href: 'https://map.themirrorcafe.cc', label: 'Official Interactive Map' }}>
      <MapCard image={images.elements.map.normal} />
    </HubPage>
  );
}
