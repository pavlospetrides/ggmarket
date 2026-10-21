"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { buildAuthCallbackUrl } from "@/lib/auth-redirect";
import { useHydrated } from "./use-hydrated";

export function ForgotPasswordForm({ initialStatus = "" }: { initialStatus?: string }) {
  const hydrated = useHydrated();
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(
        String(formData.get("email")),
        {
          redirectTo: buildAuthCallbackUrl(location.origin, "/reset-password"),
        },
      );
      setStatus(
        error
          ? "The reset email could not be sent."
          : "If an account exists, a reset link has been sent.",
      );
    } catch {
      setStatus("The reset email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action="/auth/forgot-password" method="post" onSubmit={submit} className="space-y-4" aria-busy={busy} data-hydrated={hydrated}>
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          className="input"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
      </div>
      {status && (
        <p className="text-sm text-[var(--text-secondary)]" role="status" aria-live="polite">
          {status}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
