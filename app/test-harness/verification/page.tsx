import { notFound } from "next/navigation";
import { EmailVerificationCard } from "@/components/email-verification-card";
import { SignupWelcome } from "@/components/signup-welcome";

export const dynamic = "force-dynamic";

export default async function VerificationHarnessPage({ searchParams }: { searchParams: Promise<{ confirmed?: string; status?: string; welcome?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const query = await searchParams;
  const confirmed = query.confirmed === "1";
  return <main className="container-page max-w-xl py-10">{confirmed && query.status === "verified" && query.welcome === "1" ? <SignupWelcome userId="verification-harness-user" /> : null}<section className="card p-6"><h1 className="text-xl font-bold">Account email</h1><EmailVerificationCard email="iphone@example.test" confirmed={confirmed} initialStatus={query.status} /></section></main>;
}
