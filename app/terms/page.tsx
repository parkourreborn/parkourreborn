import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms for using Parkour Reborn Hub.',
  alternates: { canonical: '/terms' },
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn"><Link href="/">&#8592; Back</Link></Button>
          <article className="legal-page">
            <header><span className="legal-page__eyebrow">Parkour Reborn Hub</span><h1>Terms of Service</h1><p>Last updated 17 September 2026</p></header>

            <section><h2>1. Who runs this hub</h2><p>Parkour Reborn Hub is an independent fan website run by ElkkuT, an individual based in Finland. It brings together tools, community information, games, and links related to PARKOUR Reborn. The hub is not the PARKOUR Reborn game and is not operated by or officially affiliated with its developers, Roblox, or Discord. Contact with the game developers and their awareness of the hub do not mean they endorse it.</p><p>These terms apply to this website and its features. Other sites, the PARKOUR Reborn game, Roblox, Discord, and any separate bot may have their own terms.</p></section>

            <section><h2>2. Using the hub</h2><p>You may browse and use the hub for personal, lawful purposes. Some features need a Discord account. If you are a minor, ask a parent or guardian for help where required by law or by the rules of a linked service.</p><p>Do not disrupt the site, bypass limits or security, use automated traffic that harms the service, submit unlawful or infringing material, or misuse other people’s accounts or data. We may limit access or remove content when needed to protect users, rights holders, or the service.</p></section>

            <section><h2>3. Accounts, games, and AI</h2><p>Discord sign-in uses the basic <code>identify</code> permission. You are responsible for your Discord account. The hub can store game progress, scores, and profile details when you use account features. You can deactivate or delete your hub account in the account panel. Deactivation pauses access; deletion removes the account and associated personal game data as described in the <Link href="/privacy">Privacy Policy</Link>.</p><p>Games, calculators, maps, community information, and Reborn AI are offered for fun and reference. Results and AI answers can be wrong or unavailable. Do not send passwords, private information, or sensitive personal data to Reborn AI. The hub may change, pause, or stop features over time.</p></section>

            <section><h2>4. Content and intellectual property</h2><p>ElkkuT owns the original hub content and code, except material owned by others. PARKOUR Reborn names, artwork, game assets, videos, community submissions, and other third-party material belong to their respective owners. The hub uses such material with permission or another applicable right; its appearance here does not transfer ownership to you. Please ask before copying or republishing hub content, and follow the rights holder’s rules for third-party material.</p><p>If you send us material for possible inclusion, you must have the right to share it. You keep your ownership and give ElkkuT permission to display, adapt for formatting, and remove it as needed for the hub. We do not promise to publish submissions. To report a rights issue, email <a href="mailto:elkkut@parkourreborn.com">elkkut@parkourreborn.com</a>.</p></section>

            <section><h2>5. Links and other services</h2><p>The hub links to and may display content from services such as Discord, Roblox, YouTube, and community sites. Their availability, content, and privacy practices are their responsibility. Opening an external service means its own rules apply.</p></section>

            <section><h2>6. Availability and responsibility</h2><p>The hub is offered free of charge and as available. We try to keep it useful and secure, but cannot promise uninterrupted access, error-free data, or that saved progress will never be lost. To the extent allowed by law, ElkkuT is not responsible for losses caused by outages, inaccurate information, or external services. Nothing in these terms limits rights or remedies that cannot legally be excluded, including mandatory consumer rights.</p></section>

            <section><h2>7. Changes and law</h2><p>We may update these terms as the hub changes. The updated date will show when they were revised. Material changes will be brought to users’ attention where appropriate. Finnish law applies, without taking away any mandatory protections you have under the law where you live.</p></section>

            <section><h2>8. Contact</h2><p>For legal or copyright questions, email <a href="mailto:elkkut@parkourreborn.com">elkkut@parkourreborn.com</a>. For help with the hub, email <a href="mailto:support@parkourreborn.com">support@parkourreborn.com</a>.</p></section>
          </article>
        </div>
      </section>
    </main>
  );
}
