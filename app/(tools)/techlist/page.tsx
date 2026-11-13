import type { Metadata } from 'next';
import HubPage from '@/components/hub-page';
import TechList from '@/components/tools/techlist';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Tech List',
  description: 'See all PARKOUR Reborn techs.',
  alternates: { canonical: '/techlist' },
};

export default function Page() {
  return (
    <HubPage title="Tech List" image={images.backgrounds.tools.techlist}>
      <TechList />
    </HubPage>
  );
}
