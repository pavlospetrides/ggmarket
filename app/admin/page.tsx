import type { Metadata } from "next";
import { AlertTriangle, Shield } from "lucide-react";
import { AdminReportActions } from "@/components/admin-report-actions";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Moderation", robots: { index: false, follow: false } };
type ReportRow = { id: string; reason: string; details: string | null; listing: { id: string; title: string; status: string } | null };

export default async function AdminPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase!.from("reports").select("id, reason, details, status, created_at, listing:listings(id,title,status)").eq("status", "open").order("created_at", { ascending: false }).limit(50);
  const reports = (data ?? []) as unknown as ReportRow[];
  return <div className="container-page py-10">
    <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#2e2031] text-[#ff9ca6]"><Shield /></span><div><p className="eyebrow">Staff only</p><h1 className="text-3xl font-black">Moderation</h1></div></div>
    <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="card p-5"><p className="text-sm text-[var(--muted)]">Open reports</p><strong className="mt-2 block text-3xl">{reports.length}</strong></div><div className="card p-5"><p className="text-sm text-[var(--muted)]">Removed today</p><strong className="mt-2 block text-3xl">0</strong></div><div className="card p-5"><p className="text-sm text-[var(--muted)]">Average review time</p><strong className="mt-2 block text-3xl">—</strong></div></div>
    <section className="mt-8 card overflow-hidden"><div className="border-b border-[var(--border)] p-5"><h2 className="font-bold">Reported listings</h2></div>{reports.length ? reports.map((report) => <div key={report.id} className="grid gap-3 border-b border-[var(--border)] p-5 last:border-0 sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-wide text-[#ff9ca6]">{report.reason}</p><strong className="mt-1 block">{report.listing?.title ?? "Unavailable listing"}</strong><p className="mt-1 text-sm text-[var(--muted)]">{report.details || "No additional details"}</p></div><AdminReportActions reportId={report.id} listingId={report.listing?.id ?? ""} /></div>) : <div className="grid min-h-56 place-items-center text-center"><div><AlertTriangle className="mx-auto text-[var(--muted)]" /><p className="mt-3 font-bold">Queue is clear</p><p className="mt-1 text-sm text-[var(--muted)]">No reports need review.</p></div></div>}</section>
  </div>;
}
