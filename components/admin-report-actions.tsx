"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminReportActions({
  reportId,
  listingId,
}: {
  reportId: string;
  listingId: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function act(action: "dismiss" | "remove") {
    if (busy) return;
    setBusy(true);
    setStatus(action === "remove" ? "Removing listing…" : "Dismissing report…");
    try {
      const response = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reportId, listingId, action }),
      });
      const result = await response.json();
      if (!response.ok) {
        setStatus(result.error || "The report could not be updated. Try again.");
        return;
      }
      setStatus(action === "remove" ? "Listing removed." : "Report dismissed.");
      setConfirming(false);
      router.refresh();
    } catch {
      setStatus("The report could not be updated. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-w-0 sm:max-w-sm">
      {confirming ? (
        <div className="rounded-[var(--radius-md)] bg-[#2e1b24] p-3" role="alert">
          <p className="text-sm text-[#ffc1c7]">
            Remove this listing? It will no longer appear in the marketplace.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              className="btn-secondary text-xs"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Cancel removal
            </button>
            <button
              type="button"
              className="btn-danger text-xs"
              disabled={busy}
              onClick={() => void act("remove")}
            >
              Confirm removal
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            disabled={busy}
            onClick={() => void act("dismiss")}
            className="btn-secondary text-xs"
          >
            Dismiss
          </button>
          <button
            type="button"
            disabled={busy || !listingId}
            onClick={() => setConfirming(true)}
            className="btn-danger text-xs"
          >
            Remove listing
          </button>
        </div>
      )}
      {status ? (
        <p
          className="mt-2 text-xs text-[var(--muted)] [overflow-wrap:anywhere]"
          role="status"
          aria-live="polite"
        >
          {status}
        </p>
      ) : null}
    </div>
  );
}
