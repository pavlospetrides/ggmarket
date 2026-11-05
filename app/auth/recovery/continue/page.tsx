import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Continue password reset",
  robots: { index: false },
  referrer: "same-origin",
};

export default function ContinuePasswordRecoveryPage() {
  return (
    <AuthShell
      title="Continue password reset"
      subtitle="Confirm that you want to create a new password."
    >
      <div className="space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#2a203f] text-[#c7baff]">
          <KeyRound className="size-7" aria-hidden="true" />
        </div>
        <p className="text-base leading-7 text-[var(--text-secondary)]">
          For your security, the recovery link has not been used yet. Continue only if you requested this password reset.
        </p>
        <form action="/auth/recovery/confirm" method="post">
          <button className="btn-primary w-full" type="submit">Continue to create new password</button>
        </form>
        <Link className="block text-sm font-bold text-[#aa98ff]" href="/login">Cancel and return to login</Link>
      </div>
    </AuthShell>
  );
}
