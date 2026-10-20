import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "How GGMarket uses essential authentication cookies and browser storage.",
};

const rows = [
  {
    name: <code>sb-&lt;project-ref&gt;-auth-token</code>,
    purpose: "Keeps a requested GGMarket account signed in and lets Supabase refresh the session. Large values may be split into numbered cookies such as .0 and .1.",
    duration: "Persistent, with a library maximum age of 400 days. Server expiry, refresh-token rotation, logout, or account security actions may end it earlier.",
    data: "Encoded access and refresh credentials plus session and user metadata. The value must be treated as confidential.",
  },
  {
    name: <code>sb-&lt;project-ref&gt;-auth-token-code-verifier</code>,
    purpose: "Completes a PKCE authentication, email-confirmation, or password-recovery callback securely.",
    duration: "Removed after a successful exchange. An abandoned flow can remain until the same 400-day cookie ceiling or browser deletion.",
    data: "A random verifier used to bind the browser to the authentication flow; it is not an advertising identifier.",
  },
  {
    name: <code>ggmarket-sw-recovery</code>,
    purpose: "Prevents repeated reloads while recovering from an outdated service worker or application bundle.",
    duration: "Per-tab sessionStorage; removed as soon as the application hydrates successfully.",
    data: "The value 1 only. No account or marketplace information.",
  },
  {
    name: <code>ggmarket-shell-v3</code>,
    purpose: "Keeps the offline page and GGMarket icon available through the browser Cache Storage API in production.",
    duration: "Until the cache version changes, the service worker is removed, or the browser/site data is cleared.",
    data: "Only /offline and /icon.svg. Authenticated pages and API responses are not cached.",
  },
];

export default function CookiePolicyPage() {
  return <div className="policy-page container-page">
    <header className="policy-hero">
      <h1>Cookie policy</h1>
      <p className="policy-status">Essential only</p>
      <p>GGMarket currently uses browser storage only to provide account sessions, secure authentication callbacks, and a minimal offline shell. It uses no analytics, advertising, or marketing cookies.</p>
      <p className="policy-updated">Last updated: 20 October 2026</p>
    </header>

    <div className="policy-layout">
      <aside className="policy-summary" aria-label="Cookie policy summary">
        <strong>No consent banner</strong>
        <p>Because the verified technologies are strictly necessary for services you request, GGMarket does not ask for cookie consent or show optional-purpose controls.</p>
      </aside>
      <article className="policy-copy">
        <section>
          <h2>What is stored</h2>
          <div className="policy-table-wrap">
            <table className="policy-table">
              <thead><tr><th>Key or cache</th><th>Purpose</th><th>Duration</th><th>Information involved</th></tr></thead>
              <tbody>{rows.map((row, index) => <tr key={index}><th scope="row">{row.name}</th><td data-label="Purpose">{row.purpose}</td><td data-label="Duration">{row.duration}</td><td data-label="Information involved">{row.data}</td></tr>)}</tbody>
            </table>
          </div>
        </section>

        <section>
          <h2>Security attributes</h2>
          <p>Supabase authentication cookies use <code>Path=/</code> and <code>SameSite=Lax</code>. GGMarket adds <code>Secure</code> in production so browsers send them only over HTTPS. No shared <code>Domain</code> is configured.</p>
          <p>They are intentionally not <code>HttpOnly</code>: the installed Supabase browser/SSR model must read and replace the cookie to persist and refresh a session. Forcing <code>HttpOnly</code> in this architecture would break authentication rather than harden it.</p>
        </section>

        <section>
          <h2>Your choices</h2>
          <p>You can use public marketplace pages without an authentication cookie. Signing in, registering, confirming an email, or resetting a password activates storage needed for that request. Logging out invalidates the Supabase session and clears its auth storage; browser settings can also clear site data.</p>
          <p>If GGMarket later introduces any optional analytics, advertising, or similar technology, it must remain off until a valid choice is obtained and this policy and the interface must be updated.</p>
        </section>

        <section>
          <h2>Legal context</h2>
          <p>EU ePrivacy rules exempt storage that is strictly necessary to provide a service explicitly requested by the user. Consent, when required, must still meet GDPR standards and be as easy to withdraw as to give.</p>
          <p className="policy-links"><a href="https://eur-lex.europa.eu/eli/dir/2002/58/art_5/par_3/oj/eng">EU ePrivacy Directive, Article 5(3)</a><a href="https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en">EDPB consent guidance</a></p>
        </section>

        <section>
          <h2>Related information</h2>
          <p>See the <Link href="/privacy">Privacy policy</Link> for session processing, service providers, rights, and the business details still awaiting owner review.</p>
        </section>
      </article>
    </div>
  </div>;
}
