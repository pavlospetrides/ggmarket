import type { ReactNode } from "react";

type MastheadVariant = "commerce" | "identity" | "communication" | "operations" | "trust";

export function PageMasthead({
  eyebrow,
  title,
  description,
  meta,
  actions,
  variant = "commerce",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  variant?: MastheadVariant;
}) {
  return (
    <header className={`exchange-masthead exchange-masthead--${variant}`}>
      <div className="exchange-masthead__index" aria-hidden="true">
        <span>GG</span>
        <span>/ MARKET</span>
      </div>
      <div className="exchange-masthead__copy">
        <p className="eyebrow">{eyebrow}</p>{/* taste-skill-ignore -- concise route context, not decorative filler */}
        <h1>{title}</h1>
        {description ? <p className="exchange-masthead__description">{description}</p> : null}
        {meta ? <div className="exchange-masthead__meta">{meta}</div> : null}
      </div>
      {actions ? <div className="exchange-masthead__actions">{actions}</div> : null}
      <div className="exchange-masthead__geometry" aria-hidden="true"><span /><span /><span /></div>
    </header>
  );
}
