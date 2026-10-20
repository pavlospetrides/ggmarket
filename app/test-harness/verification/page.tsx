import { notFound } from "next/navigation";
import { EmailVerificationCard } from "@/components/email-verification-card";

export const dynamic = "force-dynamic";

export default async function VerificationHarnessPage({ searchParams }: { searchParams: Promise<{ confirmed?: string; status?: string }> }) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const query = await searchParams;
  return <main className="container-page max-w-xl py-10"><section className="card p-6"><h1 className="text-xl font-bold">Account email</h1><EmailVerificationCard email="iphone@example.test" confirmed={query.confirmed === "1"} initialStatus={query.status} /></section></main>;
}
