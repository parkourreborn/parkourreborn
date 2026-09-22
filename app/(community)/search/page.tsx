import type { Metadata } from 'next';
import Link from 'next/link';
import CommunitySearch from '@/components/community/search';
import PageHero from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Search',
  description: 'Search for memes, files and other content.',
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/">&#8592; Back</Link>
          </Button>
          <PageHero title="Search" image={images.backgrounds.community.search} />
          <CommunitySearch />
        </div>
      </section>
    </main>
  );
}
