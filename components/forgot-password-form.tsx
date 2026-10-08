"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ForgotPasswordForm() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const formData = new FormData(event.currentTarget);
    const { error } = await createClient().auth.resetPasswordForEmail(
      String(formData.get("email")),
      {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      },
    );
    setStatus(
      error
        ? "The reset email could not be sent."
        : "If an account exists, a reset link has been sent.",
    );
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
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
        <p className="text-sm text-[var(--muted)]" role="status">
          {status}
        </p>
      )}
      <button disabled={busy} className="btn-primary w-full">
        {busy ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
