import type { Metadata } from 'next';
import CommunitySearch from '@/components/community/search';
import HubPage from '@/components/hub-page';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for memes, files and other content.',
  alternates: { canonical: '/search' },
};

export default function Page() {
  return (
    <HubPage title="Search" image={images.backgrounds.community.search}>
      <CommunitySearch />
    </HubPage>
  );
}
