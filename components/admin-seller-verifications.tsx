"use client";

import { useState } from "react";
import type { AdminVerificationRow } from "@/lib/seller-growth";

const decisionOptions = [
  ["approve", "Approve"],
  ["more_info", "Request more information"],
  ["reject", "Reject"],
  ["revoke", "Revoke verification"],
] as const;

export function AdminSellerVerifications({ applications, enabled }: { applications: AdminVerificationRow[]; enabled: boolean }) {
  const [rows, setRows] = useState(applications);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function decide(event: React.FormEvent<HTMLFormElement>, application: AdminVerificationRow) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusyId(application.id);
    setError("");
    try {
      const response = await fetch("/api/admin/seller-verifications", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          applicationId: application.id,
          action: form.get("action"),
          reason: form.get("reason"),
          reviewerNote: form.get("reviewerNote"),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Decision could not be saved.");
      setRows((current) => current.map((row) => row.id === application.id ? { ...row, ...body.application } : row));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Decision could not be saved.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="grid gap-4">
      {error ? <p role="alert" className="text-sm text-[var(--danger)]">{error}</p> : null}
      {rows.length ? rows.map((application) => (
        <article key={application.id} data-ui className="card grid min-w-0 gap-5 overflow-hidden p-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,25rem)]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2"><strong className="[overflow-wrap:anywhere]">{application.seller?.display_name ?? "Unknown seller"}</strong><span className="badge">{application.status.replaceAll("_", " ")}</span></div>
            <p className="mt-1 text-sm text-[var(--muted)]">@{application.seller?.username ?? "unknown"} · <time dateTime={application.created_at}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Athens" }).format(new Date(application.created_at))}</time></p>
            <p className="mt-4 whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">{application.application_note ?? "No seller statement."}</p>
            {application.decision_reason ? <p className="mt-3 text-sm text-[var(--text-secondary)]"><strong>Previous reason:</strong> {application.decision_reason}</p> : null}
            {application.reviewer ? <p className="mt-2 text-xs text-[var(--muted)]">Last reviewed by {application.reviewer.display_name}</p> : null}
            {application.audit?.length ? <details className="mt-5 rounded-xl bg-[var(--surface-alt)] p-4"><summary className="cursor-pointer font-bold">Decision history</summary><ol className="mt-3 grid gap-3">{application.audit.toSorted((left, right) => right.created_at.localeCompare(left.created_at)).map((event) => <li key={event.id} className="text-sm leading-6"><strong className="capitalize">{event.action.replaceAll("_", " ")}</strong> · {event.actor?.display_name ?? "System"} · <time dateTime={event.created_at}>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Athens" }).format(new Date(event.created_at))}</time><span className="block text-[var(--muted)]">{event.previous_status ?? "none"} → {event.next_status}</span>{event.reason ? <span className="block">{event.reason}</span> : null}</li>)}</ol></details> : null}
          </div>
          <form className="grid content-start gap-3" onSubmit={(event) => decide(event, application)}>
            <label className="grid gap-1 text-sm font-bold">Decision<select className="input" name="action" disabled={!enabled || busyId === application.id}>{decisionOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="grid gap-1 text-sm font-bold">Reason shown to seller<textarea className="input min-h-20 resize-y" name="reason" maxLength={1000} /></label>
            <label className="grid gap-1 text-sm font-bold">Private reviewer note<textarea className="input min-h-20 resize-y" name="reviewerNote" maxLength={2000} /></label>
            <button className="btn-primary" disabled={!enabled || busyId === application.id}>{busyId === application.id ? "Recording…" : "Record decision"}</button>
          </form>
        </article>
      )) : <div className="empty-state"><p>No applications match this view.</p></div>}
    </div>
  );
}

