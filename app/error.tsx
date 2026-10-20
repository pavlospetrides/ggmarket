"use client";
import { AlertTriangle } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="system-state container-page grid min-h-[60vh] place-items-center py-12 text-center">
    <div className="system-state__panel surface-panel max-w-lg p-8 sm:p-10">
      <span className="empty-state-icon !bg-[#2b1921] !text-[#ff8c98]"><AlertTriangle aria-hidden="true" /></span>
      <p className="eyebrow mt-5">System signal</p>{/* taste-skill-ignore -- error-state context */}
      <h1 className="mt-2 text-3xl font-[850] tracking-[-.04em]">We couldn&apos;t load this page</h1>
      <p className="mt-3 leading-6 text-[var(--muted)]">The marketplace service may be temporarily unavailable. Your data is safe—try again in a moment.</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  </div>;
}
