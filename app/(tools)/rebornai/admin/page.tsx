import type { Metadata } from 'next';
import Link from 'next/link';
import RebornAiAdmin from '@/components/tools/rebornai-admin';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Reborn AI admin',
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn">
            <Link href="/rebornai">&#8592; Reborn AI</Link>
          </Button>
          <RebornAiAdmin />
        </div>
      </section>
    </main>
  );
}
