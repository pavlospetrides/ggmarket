"use client";

import { CircleCheck, MailCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useHydrated } from "./use-hydrated";

type EmailVerificationCardProps = {
  email: string;
  confirmed: boolean;
  initialStatus?: string;
};

export function EmailVerificationCard({ email, confirmed, initialStatus }: EmailVerificationCardProps) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    initialStatus === "invalid_or_expired"
      ? "This verification link is invalid or has expired. Request a new email below."
      : "",
  );
  const [error, setError] = useState(initialStatus === "invalid_or_expired");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  async function resend() {
    if (busy || cooldown > 0) return;
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/verification/email", { method: "POST" });
      const body = await response.json() as { status?: string; error?: string };
      if (!response.ok) throw new Error(body.error || "The verification email could not be sent.");
      if (body.status === "already_verified") {
        router.refresh();
        return;
      }
      setMessage("Verification email sent. Check your inbox.");
      setCooldown(60);
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "The verification email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  if (confirmed) {
    return (
      <div className="mt-4 rounded-xl border border-[#285c43] bg-[#13271e] p-4 text-sm text-[var(--success)]" role="status">
        <div className="flex items-center gap-2 font-bold"><CircleCheck className="size-5" />Account verified successfully</div>
        <p className="mt-1 break-all text-xs text-[var(--text-secondary)]">{email}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div className="flex items-start gap-3">
        <MailCheck className="mt-0.5 size-5 shrink-0 text-[#aa98ff]" />
        <div className="min-w-0">
          <p className="text-sm font-bold">Email confirmation pending</p>
          <p className="mt-1 break-all text-xs text-[var(--muted)]">{email}</p>
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--text-secondary)]">
        Supabase Auth confirms your email only after you open a valid link. This does not approve seller or identity verification.
      </p>
      {message && <p className={`mt-3 text-sm ${error ? "text-[#ff9ca6]" : "text-[var(--success)]"}`} role={error ? "alert" : "status"}>{message}</p>}
      <button
        type="button"
        className="btn-secondary mt-4 min-h-11 w-full sm:w-auto"
        disabled={!hydrated || busy || cooldown > 0}
        onClick={resend}
      >
        {busy ? "Sending…" : cooldown > 0 ? `Resend available in ${cooldown}s` : "Resend verification email"}
      </button>
    </div>
  );
}
