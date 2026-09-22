import type { Metadata } from 'next';
import Link from 'next/link';
import ComingSoon from '@/components/coming-soon';
import PageHero from '@/components/page-hero';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'Bag Opening Simulator',
  description: 'PARKOUR Reborn bag opening simulator.',
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/">&#8592; Back</Link>
          </Button>
          <PageHero title="Bag Opening Simulator" image={images.backgrounds.games.bagopensimulator} />
          <ComingSoon />
        </div>
      </section>
    </main>
  );
}
