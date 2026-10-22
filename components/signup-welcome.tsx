"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function SignupWelcome({ userId }: { userId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `ggmarket:signup-welcome:${userId}`;
    const url = new URL(window.location.href);
    url.searchParams.delete("welcome");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    if (window.sessionStorage.getItem(key)) {
      return;
    }
    window.sessionStorage.setItem(key, "shown");
    window.queueMicrotask(() => setVisible(true));
  }, [userId]);

  if (!visible) return null;
  return (
    <section className="mb-5 rounded-[var(--radius-xl)] bg-[#17142d] p-5 sm:p-7" aria-labelledby="signup-welcome-title">
      <p className="eyebrow">Account ready</p>
      <h2 id="signup-welcome-title" className="mt-2 text-2xl font-extrabold tracking-[-.04em] sm:text-3xl">Welcome to GGMarket!</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
        Your gaming marketplace starts here. Discover consoles, gaming PCs, components, games and more.
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link href="/marketplace" className="btn-primary">Browse the Marketplace</Link>
        <Link href="/settings" className="btn-secondary">Complete Your Profile</Link>
      </div>
    </section>
  );
}
