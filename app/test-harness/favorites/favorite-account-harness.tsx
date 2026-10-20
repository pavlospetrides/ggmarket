"use client";

import { useState } from "react";
import { FavoriteButton } from "@/components/favorite-button";

const listingId = "77777777-7777-4777-8777-777777777777";
const accounts = {
  a: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", label: "Account A" },
  b: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", label: "Account B" },
} as const;

export function FavoriteAccountHarness() {
  const [accountKey, setAccountKey] = useState<keyof typeof accounts>("a");
  const [saved, setSaved] = useState({ a: false, b: false });
  const account = accounts[accountKey];
  const favoriteProps = {
    listingId,
    viewerId: account.id,
    initialFavorite: saved[accountKey],
    onFavoriteChange: (_listingId: string, active: boolean) => {
      setSaved((current) => ({ ...current, [accountKey]: active }));
    },
  };

  return (
    <main className="container-page space-y-6 py-8">
      <h1>Multi-account favorites harness</h1>
      <p aria-live="polite">Signed in as {account.label}</p>
      <div className="flex gap-3">
        <button type="button" className="btn-secondary" onClick={() => setAccountKey("a")}>Log out and switch to Account A</button>
        <button type="button" className="btn-secondary" onClick={() => setAccountKey("b")}>Log out and switch to Account B</button>
      </div>
      <p>Persisted A: {saved.a ? "saved" : "not saved"}</p>
      <p>Persisted B: {saved.b ? "saved" : "not saved"}</p>
      <section aria-label="Marketplace card favorite">
        <FavoriteButton {...favoriteProps} />
      </section>
      <section aria-label="Listing detail favorite">
        <FavoriteButton {...favoriteProps} />
      </section>
    </main>
  );
}
