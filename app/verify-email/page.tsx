import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { ResendVerificationForm } from "@/components/resend-verification-form";

export const metadata: Metadata = { title: "Verify email", robots: { index: false } };

const feedback: Record<string, { title: string; message: string }> = {
  expired_or_used: {
    title: "This verification link is no longer valid",
    message: "It has expired or has already been used. If you already confirmed your account, sign in. Otherwise, request a new email below.",
  },
  invalid: {
    title: "This verification link is invalid",
    message: "The link is incomplete or does not match a GGMarket confirmation request. Request a new email below.",
  },
};

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status = "invalid" } = await searchParams;
  const content = feedback[status] ?? feedback.invalid;

  return (
    <AuthShell title={content.title} subtitle={content.message}>
      <ResendVerificationForm />
      <p className="mt-5 text-center text-sm text-[var(--muted)]">
        Already verified? <Link className="font-bold text-[#aa98ff]" href="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
