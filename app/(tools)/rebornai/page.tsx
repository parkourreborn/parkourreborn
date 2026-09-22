import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/page-hero';
import RebornAi from '@/components/tools/rebornai';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Reborn AI',
  description: 'Ask about PARKOUR Reborn techs, time trials, world records and community stuff.',
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/">&#8592; Back</Link>
          </Button>
          <PageHero title="Reborn AI" image={images.backgrounds.tools.rebornai} />
          <RebornAi />
        </div>
      </section>
    </main>
  );
}
