"use client";

import { useState } from "react";

export function AdminSellerGrowthActions({ entityType, entityId, state }: { entityType: "founder" | "entitlement"; entityId: string; state: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const actions = entityType === "founder"
    ? state === "active" ? ["revoke"] : ["restore"]
    : state === "suspended" ? ["resume", "revoke"] : ["suspend", "revoke"];
  async function act(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/admin/seller-growth", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ entityType, entityId, action: form.get("action"), reason: form.get("reason") }) });
    const body = await response.json();
    setMessage(response.ok ? "Action recorded. Refresh to see the updated state." : body.error || "Action failed.");
    setBusy(false);
  }
  return <form className="mt-3 grid gap-2 sm:grid-cols-[auto_minmax(12rem,1fr)_auto]" onSubmit={act}><label className="sr-only" htmlFor={`action-${entityId}`}>Action</label><select id={`action-${entityId}`} className="input capitalize" name="action">{actions.map((action) => <option key={action} value={action}>{action}</option>)}</select><label className="sr-only" htmlFor={`reason-${entityId}`}>Reason</label><input id={`reason-${entityId}`} className="input" name="reason" minLength={5} maxLength={1000} placeholder="Required audit reason" required /><button className="btn-secondary" disabled={busy}>{busy ? "Saving…" : "Apply"}</button>{message ? <p className="text-xs sm:col-span-3" role="status">{message}</p> : null}</form>;
}

export function AdminReferralQualification() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    const response = await fetch("/api/admin/seller-growth", { method: "POST" });
    const body = await response.json();
    setMessage(response.ok ? `${body.awarded} referral reward${body.awarded === 1 ? "" : "s"} issued.` : body.error || "Qualification failed.");
    setBusy(false);
  }
  return <div className="mt-4"><button className="btn-secondary" type="button" onClick={run} disabled={busy}>{busy ? "Checking…" : "Run qualification"}</button>{message ? <p className="mt-2 text-sm" role="status">{message}</p> : null}</div>;
}

