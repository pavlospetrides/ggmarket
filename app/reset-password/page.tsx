import type { Metadata } from "next";
import Link from "next/link";
import { CircleCheck, KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";
import { hasRecoveryAuthenticationMethod } from "@/lib/password-recovery";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create new password", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function RecoveryMessage({ success = false }: { success?: boolean }) {
  return (
    <div className="space-y-5 text-center" role="status">
      <div className={`mx-auto grid size-14 place-items-center rounded-full ${success ? "bg-[#143926] text-[var(--success)]" : "bg-[#2a203f] text-[#c7baff]"}`}>
        {success ? <CircleCheck className="size-7" aria-hidden="true" /> : <KeyRound className="size-7" aria-hidden="true" />}
      </div>
      <p className="text-base leading-7 text-[var(--text-secondary)]">
        {success
          ? "Your password has been changed. You can now sign in with your new password."
          : "This reset link is invalid, expired, or has already been used. Request a new link to continue."}
      </p>
      <Link className="btn-primary w-full" href={success ? "/login" : "/forgot-password"}>
        {success ? "Go to login" : "Request new reset link"}
      </Link>
      {!success ? <Link className="block text-sm font-bold text-[#aa98ff]" href="/login">Cancel and return to login</Link> : null}
    </div>
  );
}

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  const reason = typeof params.reason === "string" ? params.reason : "";
  if (status === "success") {
    return <AuthShell title="Password updated" subtitle="Your Lootriva account is secure again."><RecoveryMessage success /></AuthShell>;
  }
  if (["expired_or_used", "invalid", "unavailable"].includes(status)) {
    return <AuthShell title="Reset link unavailable" subtitle="Start again with a fresh one-time link."><RecoveryMessage /></AuthShell>;
  }

  let claims: Awaited<ReturnType<NonNullable<Awaited<ReturnType<typeof createClient>>>["auth"]["getClaims"]>> = { data: null, error: null };
  try {
    const supabase = await createClient();
    if (supabase) claims = await supabase.auth.getClaims();
  } catch {
    claims = { data: null, error: null };
  }
  if (claims.error || !hasRecoveryAuthenticationMethod(claims.data?.claims.amr)) {
    return <AuthShell title="Reset link unavailable" subtitle="Start again with a fresh one-time link."><RecoveryMessage /></AuthShell>;
  }

  const fallbackErrors: Record<string, { message: string; field: "password" | "confirmation" | "form" }> = {
    too_short: { message: "Use at least 8 characters.", field: "password" },
    too_long: { message: "Use no more than 1,024 characters.", field: "password" },
    mismatch: { message: "Passwords do not match.", field: "confirmation" },
    same_password: { message: "Choose a password you have not used before.", field: "form" },
    weak_password: { message: "Choose a stronger password and try again.", field: "form" },
    update_failed: { message: "Your password could not be updated. Request a new reset link.", field: "form" },
  };
  const initialError = ["validation", "rejected"].includes(status) ? fallbackErrors[reason] : undefined;
  return (
    <AuthShell title="Create new password" subtitle="Use at least 8 characters.">
      <ResetPasswordForm initialError={initialError?.message} initialErrorField={initialError?.field} />
    </AuthShell>
  );
}
