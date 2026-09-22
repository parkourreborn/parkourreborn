import type { Metadata } from 'next';
import Link from 'next/link';
import PageHero from '@/components/page-hero';
import XPCalculator from '@/components/tools/xpcalc';
import { Button } from '@/components/ui/button';
import { images } from '@/lib/assets';

export const metadata: Metadata = {
  title: 'XP Calculator',
  description: 'Calculate PARKOUR Reborn levels, XP, and combo score.',
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/">&#8592; Back</Link>
          </Button>
          <PageHero title="XP Calculator" image={images.backgrounds.tools.xpcalc} />
          <XPCalculator />
        </div>
      </section>
    </main>
  );
}
