"use client";

import { useState, type FormEvent } from "react";
import { useHydrated } from "./use-hydrated";

export function ResendVerificationForm() {
  const hydrated = useHydrated();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(false);
    setMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/verification/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: String(formData.get("email")) }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "The verification email could not be sent.");
      setMessage("If an unverified account exists, a new confirmation email has been sent.");
    } catch (reason) {
      setError(true);
      setMessage(reason instanceof Error ? reason.message : "The verification email could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-4" aria-busy={busy}>
      <div>
        <label className="label" htmlFor="verification-email">Email</label>
        <input className="input" id="verification-email" name="email" type="email" autoComplete="email" required />
      </div>
      {message && <p className={`text-sm ${error ? "text-[#ff9ca6]" : "text-[var(--success)]"}`} role={error ? "alert" : "status"}>{message}</p>}
      <button className="btn-primary w-full" type="submit" disabled={!hydrated || busy} data-hydrated={hydrated}>
        {busy ? "Sending…" : "Send a new confirmation email"}
      </button>
    </form>
  );
}
