import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
  referrer: "same-origin",
};

export default function SignupConfirmationPage() {
  return (
    <AuthShell title="Confirm your email" subtitle="Finish creating your Lootriva account.">
      <div className="space-y-5 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-[#143926] text-[var(--success)]">
          <MailCheck className="size-7" aria-hidden="true" />
        </div>
        <p className="text-base leading-7 text-[var(--text-secondary)]">
          Your email has not been verified yet. Continue only if you created this Lootriva account.
        </p>
        <form action="/auth/confirm-signup/verify" method="post">
          <button className="btn-primary w-full" type="submit">Verify email and continue</button>
        </form>
        <Link className="block text-sm font-bold text-[#aa98ff]" href="/login">Cancel and return to login</Link>
      </div>
    </AuthShell>
  );
}
