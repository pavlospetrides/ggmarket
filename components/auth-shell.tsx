import { Logo } from "./logo";
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <div className="auth-shell container-page grid min-h-svh place-items-center py-6 sm:py-10">
    <div className="auth-exchange-grid w-full overflow-hidden">
      <aside className="auth-exchange-rail" aria-label="GGMarket buyer and seller principles">
        <Logo />
        <div className="auth-exchange-rail__statement"><p className="eyebrow">Player-to-player exchange</p>{/* taste-skill-ignore -- brand proposition context */}<p>Good gear deserves another round.</p></div>
        <ol aria-label="Marketplace principles"><li><span>1</span> Clear listings</li><li><span>2</span> Direct conversation</li><li><span>3</span> Verify before payment</li></ol>
      </aside>
      <section className="auth-exchange-form" aria-labelledby="auth-title">
        <div className="auth-exchange-form__heading"><p className="eyebrow">Secure access</p>{/* taste-skill-ignore -- form security context */}<h1 id="auth-title">{title}</h1><p>{subtitle}</p></div>
        <div className="surface-panel p-5 sm:p-8">{children}</div>
        <p className="auth-exchange-form__note">Trade smart. Verify before you pay.</p>
      </section>
    </div>
  </div>;
}
