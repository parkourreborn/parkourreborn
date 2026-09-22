import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Parkour Reborn Hub handles personal data.',
  alternates: { canonical: '/privacy' },
};

export default function Page() {
  return (
    <main className="hub-shell overflow-x-hidden">
      <section className="hub-page hub-page--wide">
        <div className="hub-container">
          <Button asChild className="back-btn"><Link href="/">&#8592; Back</Link></Button>
          <article className="legal-page">
            <header><span className="legal-page__eyebrow">Parkour Reborn Hub</span><h1>Privacy Policy</h1><p>Last updated 17 September 2026</p></header>

            <section><h2>1. Who is responsible</h2><p>ElkkuT, an individual in Finland, runs Parkour Reborn Hub and is the controller of personal data described here. For privacy requests, email <a href="mailto:elkkut@parkourreborn.com">elkkut@parkourreborn.com</a>. For general support, email <a href="mailto:support@parkourreborn.com">support@parkourreborn.com</a>. This policy covers the hub website, including its tools and games. Discord, Roblox, linked sites, and any separate bot handle their own services under their own policies.</p></section>

            <section><h2>2. Data we use and why</h2><ul>
              <li><strong>Site visits and security:</strong> Our hosting provider receives technical request data, such as IP address, browser details, page requested, and time of access. The hub also uses an IP-derived value to limit abuse of Reborn AI and Parkour Guessr. We use this to deliver and protect the site under our legitimate interests in operating a safe service (GDPR Article 6(1)(f)).</li>
              <li><strong>Discord sign-in:</strong> If you log in, Discord provides your user ID, username, display name, and avatar through the <code>identify</code> scope. We store these, your chosen hub display name, account status, and sign-in records in Firebase. We use them to create and manage your account, identify your saved data, and keep you signed in (Article 6(1)(b), providing the account service you requested).</li>
              <li><strong>Games and tools:</strong> Signed-in game saves and time trial statistics are stored in Firestore against your Discord ID. Parkour Guessr stores a temporary game ID, choices, guesses, scores, and timestamps, even if you are not signed in. We use this to run the games and show progress (Article 6(1)(b)). XP calculator values and time trial personal bests are saved in your own browser’s local storage; those values are not sent to our server by those tools.</li>
              <li><strong>Reborn AI:</strong> Your messages and recent conversation are sent to our server and then to OpenRouter and its selected model provider to answer your request. The hub does not save chat transcripts as an account record; the conversation is kept in the open page while you use it. The providers may process and retain requests under their own terms. Do not enter sensitive information. This processing is needed to provide the AI feature you choose to use (Article 6(1)(b)).</li>
              <li><strong>Contact:</strong> If you email us, we use your address and message to reply and handle your request. The basis is our legitimate interest in responding to support or rights issues (Article 6(1)(f)), or a legal obligation where one applies (Article 6(1)(c)).</li>
              <li><strong>Optional analytics:</strong> Vercel Web Analytics runs only after you select “Accept analytics” in the notice. It collects page-view and device information for aggregate traffic statistics. Vercel says this product does not use analytics cookies or store directly identifying visitor profiles. The basis is your consent (Article 6(1)(a)); declining does not affect your use of the hub.</li>
            </ul><p>You can browse most of the hub without an account. Discord data is needed for account features; game inputs are needed to play; an AI prompt is needed to get an AI answer. You do not have to provide data for optional features you do not use.</p></section>

            <section><h2>3. Cookies, local storage, and embeds</h2><p>Essential short-lived cookies support Discord OAuth and sign-in, including the OAuth state, one-time login handoff, and a session cookie that can last up to 14 days. Local storage remembers your analytics choice and the tool values described above. You can remove local data in your browser settings, but that may reset those features.</p><p>To change your analytics choice, use “Analytics settings” in the site footer. Choosing “No thanks” stops future analytics events from this browser; it does not erase earlier aggregate statistics. The site loads Google Fonts and some third-party images or video, including YouTube embeds, Discord avatars, community-hosted videos, and Cloudflare R2 images. Loading that content may send your IP address and browser information to those providers and may let them use their own cookies. See their policies for their handling of that data.</p></section>

            <section><h2>4. Who receives data</h2><p>We use Vercel for hosting and optional analytics, Google Firebase for authentication and Firestore storage, Discord for sign-in, Cloudflare for the domain and image delivery, and OpenRouter and model providers for Reborn AI. Google Fonts, YouTube, and community video hosts receive requests when their content loads. We share only the data needed for each function. We do not sell personal data.</p><p>Some providers may process data outside the European Economic Area. Where personal data is transferred, an applicable adequacy decision or other lawful safeguard, such as standard contractual clauses, must cover the transfer. Email <a href="mailto:elkkut@parkourreborn.com">elkkut@parkourreborn.com</a> for details of the safeguards applicable to your data.</p></section>

            <section><h2>5. How long data stays</h2><p>Account details and signed-in saves are kept while your account is active, unless you delete it or a longer period is required by law. Deactivation keeps the account and saves so you can reactivate. Account deletion removes the account, signed-in saves, time trial stats, and related login records; some published community content may remain with its attribution removed. Copies in provider backups may take longer to clear.</p><p>Parkour Guessr game records are marked to expire six hours after they start. Security rate-limit records are marked to expire after their time window. Actual removal from Firestore depends on its expiration cleanup being enabled and can happen later. OAuth and one-time login records have short expiry times. Support emails are kept only as long as needed to answer and document the issue, or meet a legal obligation. Hosting logs and aggregate analytics follow the provider’s retention settings.</p></section>

            <section><h2>6. Your rights</h2><p>Under the GDPR, you can ask to see, correct, erase, or receive your personal data, and to restrict or object to processing where the law allows. You can withdraw analytics consent at any time through “Analytics settings” without affecting earlier lawful processing. You can delete your hub account in the account panel. For any other request, email <a href="mailto:elkkut@parkourreborn.com">elkkut@parkourreborn.com</a>; we may need to verify that the account is yours. We will respond within the time required by law, normally one month.</p><p>You may complain to Finland’s <a href="https://tietosuoja.fi/en/home" target="_blank" rel="noopener noreferrer">Office of the Data Protection Ombudsman</a> or another competent EU/EEA data protection authority. The hub does not make decisions about you solely by automated means that produce legal or similarly significant effects.</p></section>

            <section><h2>7. Children and changes</h2><p>The hub relates to a game that younger people may enjoy. If you are a child, ask a parent or guardian before sharing personal information or using a linked service, and follow that service’s age rules. We do not knowingly ask for sensitive personal data. If you think a child’s data needs to be removed, contact us.</p><p>We will update this page when our data practices change and show the new date here. Significant changes will be brought to users’ attention where appropriate.</p></section>

            <section><h2>8. Contact</h2><p>Privacy and data requests: <a href="mailto:elkkut@parkourreborn.com">elkkut@parkourreborn.com</a>. General support: <a href="mailto:support@parkourreborn.com">support@parkourreborn.com</a>. You can also read the <Link href="/terms">Terms of Service</Link>.</p></section>
          </article>
        </div>
      </section>
    </main>
  );
}
