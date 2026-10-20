"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "./password-field";

export function ResetPasswordForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const confirmationRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password"));
    if (password !== String(formData.get("confirmation"))) {
      setError("Passwords do not match.");
      confirmationRef.current?.focus();
      setBusy(false);
      return;
    }
    try {
      const { error: authError } = await createClient().auth.updateUser({
        password,
      });
      if (authError) throw authError;
      router.replace("/settings");
      router.refresh();
    } catch {
      setError("Your password could not be updated. Request a new reset link.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <PasswordField id="password" name="password" label="New password" toggleLabel="new password" autoComplete="new-password" describedBy={error ? "password-confirmation-error" : undefined} />
      <PasswordField id="confirmation" name="confirmation" label="Confirm password" toggleLabel="confirmation password" autoComplete="new-password" invalid={Boolean(error)} describedBy={error ? "password-confirmation-error" : undefined} inputRef={confirmationRef} />
      {error && (
        <p id="password-confirmation-error" role="alert" className="text-sm text-[var(--danger)]">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="btn-primary w-full">
        {busy ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
