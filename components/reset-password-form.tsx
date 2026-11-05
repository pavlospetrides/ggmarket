"use client";

import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { validateNewPassword } from "@/lib/password-recovery";
import { PasswordField } from "./password-field";

type ErrorField = "password" | "confirmation" | "form";

export function ResetPasswordForm({ initialError = "", initialErrorField = "form" }: { initialError?: string; initialErrorField?: ErrorField }) {
  const [error, setError] = useState(initialError);
  const [errorField, setErrorField] = useState<ErrorField>(initialErrorField);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error && errorField === "form") errorRef.current?.focus();
  }, [error, errorField]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const formData = new FormData(event.currentTarget);
    const validation = validateNewPassword(
      String(formData.get("password") ?? ""),
      String(formData.get("confirmation") ?? ""),
    );
    if (!validation.ok) {
      setError(validation.message);
      setErrorField(validation.field);
      (validation.field === "password" ? passwordRef : confirmationRef).current?.focus();
      return;
    }

    setBusy(true);
    setError("");
    setErrorField("form");
    try {
      const response = await fetch("/auth/update-password", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ password: validation.password, confirmation: validation.password }),
      });
      const result = await response.json() as {
        status?: string;
        message?: string;
        field?: "password" | "confirmation";
      };
      if (!response.ok || result.status !== "success") {
        setError(result.message || "Your reset session is no longer valid. Request a new reset link.");
        setErrorField(result.field ?? "form");
        return;
      }
      window.dispatchEvent(new Event("ggmarket:auth-changed"));
      setSuccess(true);
    } catch {
      setError("Your password could not be updated. Check your connection and try again.");
      setErrorField("form");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-5 text-center" role="status" aria-live="polite">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#143926] text-[var(--success)]">
          <CircleCheck className="size-7" aria-hidden="true" />
        </div>
        <h2 className="text-xl font-bold">Password updated</h2>
        <p className="text-base leading-7 text-[var(--text-secondary)]">Your new password is ready. Sign in to continue to GGMarket.</p>
        <Link className="btn-primary w-full" href="/login">Go to login</Link>
      </div>
    );
  }

  return (
    <form action="/auth/update-password" method="post" onSubmit={submit} className="space-y-4" aria-busy={busy}>
      <PasswordField id="password" name="password" label="New password" toggleLabel="new password" autoComplete="new-password" maxLength={1024} invalid={errorField === "password"} describedBy={error ? "password-recovery-error" : undefined} inputRef={passwordRef} />
      <PasswordField id="confirmation" name="confirmation" label="Confirm new password" toggleLabel="confirmation password" autoComplete="new-password" maxLength={1024} invalid={errorField === "confirmation"} describedBy={error ? "password-recovery-error" : undefined} inputRef={confirmationRef} />
      {error ? (
        <p id="password-recovery-error" ref={errorRef} tabIndex={-1} role="alert" aria-live="polite" className="rounded-xl border border-[#5d2931] bg-[#29151a] p-3 text-sm text-[#ff9ca6]">{error}</p>
      ) : null}
      <button type="submit" disabled={busy} className="btn-primary w-full">{busy ? "Updating…" : "Update password"}</button>
      <Link className="block text-center text-sm font-bold text-[#aa98ff]" href="/login">Cancel and return to login</Link>
    </form>
  );
}
