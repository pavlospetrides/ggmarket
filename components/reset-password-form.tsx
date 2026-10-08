"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    if (password !== String(formData.get("confirmation"))) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    const { error: authError } = await createClient().auth.updateUser({
      password,
    });
    if (authError) {
      setError("Your password could not be updated. Request a new reset link.");
      setBusy(false);
      return;
    }
    router.replace("/settings");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input
          className="input"
          id="password"
          name="password"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="confirmation">
          Confirm password
        </label>
        <input
          className="input"
          id="confirmation"
          name="confirmation"
          type="password"
          minLength={8}
          autoComplete="new-password"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <button disabled={busy} className="btn-primary w-full">
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
