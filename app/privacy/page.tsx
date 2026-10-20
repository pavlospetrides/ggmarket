import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How GGMarket handles account, marketplace, and session information.",
};

export default function PrivacyPolicyPage() {
  return <div className="policy-page container-page">
    <header className="policy-hero">
      <h1>Privacy policy</h1>
      <p className="policy-status">Privacy at GGMarket</p>
      <p>This draft describes processing visible in the current GGMarket application. It deliberately leaves legal and business facts unresolved where the repository cannot prove them.</p>
      <p className="policy-updated">Last updated: 20 October 2026</p>
    </header>

    <div className="policy-layout">
      <aside className="policy-summary policy-summary-review">
        <strong>Owner review required</strong>
        <p>Insert and legally verify the controller&apos;s legal identity, address, privacy contact, lawful bases, retention schedule, processor terms, and international-transfer disclosures before launch.</p>
      </aside>
      <article className="policy-copy">
        <section>
          <h2>Information used</h2>
          <p>Depending on the features you choose, GGMarket processes account and profile details, email-verification state, listings and images, favorites and saved searches, recently viewed listings, conversations and messages, offers, trades, notifications, ratings, reports, and verification records.</p>
          <p>Authentication sessions include encoded access and refresh credentials and related user/session metadata. GGMarket does not intentionally place those credentials in localStorage or IndexedDB.</p>
        </section>

        <section>
          <h2>Why it is used</h2>
          <p>The current implementation uses this information to authenticate accounts, operate marketplace and messaging features, preserve requested preferences, deliver notifications and Realtime updates, prevent abuse, enforce authorization, and support account and listing safety.</p>
          <p>The precise GDPR lawful basis for each purpose is a controller decision and is not established by source code. The owner must document and approve that mapping before publication.</p>
        </section>

        <section>
          <h2>Authentication and storage</h2>
          <p>GGMarket uses essential first-party Supabase SSR cookies for sign-in persistence, refresh-token rotation, logout, email confirmation, and password recovery. Private authenticated responses are marked not to be stored in shared caches. The service worker caches only the offline page and site icon.</p>
          <p>Read the <Link href="/cookies">Cookie policy</Link> for the exact keys, browser-storage mechanisms, attributes, and technical maximum durations.</p>
        </section>

        <section>
          <h2>Service providers and recipients</h2>
          <p>Supabase is the verified external platform used for authentication, PostgreSQL data access, file storage, and Realtime delivery. Hosting, email-delivery, payment, moderation, support, and other provider arrangements are not proven by this repository and must not be inferred from this draft.</p>
          <p>The owner must confirm processor agreements, hosting regions, subprocessors, transfer safeguards, and which entity sends authentication emails.</p>
        </section>

        <section>
          <h2>Retention and security</h2>
          <p>The auth cookie has a technical maximum age of 400 days, but server expiry, rotation, logout, or revocation can end the session sooner. That browser limit is not a business retention schedule for account or marketplace records.</p>
          <p>GGMarket uses server-side session validation, Supabase row-level security, origin checks for state-changing requests, private response caching rules, and production HTTPS cookie restrictions. No online service can promise absolute security.</p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>Subject to applicable law, people may have rights to access, correct, erase, restrict or object to processing, receive portable data, withdraw consent where consent is used, and complain to the Cyprus Commissioner for Personal Data Protection or another competent supervisory authority.</p>
          <p>Formal request instructions and a verified privacy contact must be added by the owner. Account controls may provide immediate access to some profile changes in the meantime.</p>
        </section>

        <section className="policy-review-block">
          <h2>Owner review required</h2>
          <p>Before launch, approve the legal identity, address, privacy contact, lawful-basis table, record-by-record retention schedule, child/minor policy, data-export and deletion process, breach contact, Supabase and email-provider terms, transfer disclosures, and regulator wording.</p>
        </section>
      </article>
    </div>
  </div>;
}
