import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { isValidRecoveryTokenHash, PENDING_RECOVERY_COOKIE } from "@/lib/recovery-pending";

export const metadata: Metadata = {
  title: "Continue password reset",
  robots: { index: false },
  referrer: "no-referrer",
};

export default async function ContinuePasswordRecoveryPage() {
  const pendingToken = (await cookies()).get(PENDING_RECOVERY_COOKIE)?.value;
  const hasPendingRecovery = isValidRecoveryTokenHash(pendingToken);

  return (
    <AuthShell
      title={hasPendingRecovery ? "Continue password reset" : "Reset link unavailable"}
      subtitle={hasPendingRecovery ? "Confirm that you want to create a new password." : "Start again with a fresh one-time link."}
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#2a203f] text-[#c7baff]">
          <KeyRound className="size-7" aria-hidden="true" />
        </div>
        <p className="text-base leading-7 text-[var(--text-secondary)]">
          {hasPendingRecovery
            ? "For your security, the recovery link has not been used yet. Continue only if you requested this password reset."
            : "This reset link is invalid, expired, or has already been used."}
        </p>
        {hasPendingRecovery ? (
          <form action="/auth/recovery/confirm" method="post">
            <button className="btn-primary w-full" type="submit">Continue to create new password</button>
          </form>
        ) : (
          <Link className="btn-primary w-full" href="/forgot-password">Request new reset link</Link>
        )}
        <Link className="block text-sm font-bold text-[#aa98ff]" href="/login">Cancel and return to login</Link>
      </div>
    </AuthShell>
  );
}
