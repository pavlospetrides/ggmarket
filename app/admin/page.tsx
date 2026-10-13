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
  return <div className="container-page py-8 md:py-12">
    <div className="page-header flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl border border-[#5d3038] bg-[#2e1b24] text-[#ff9ca6]"><Shield /></span><div><p className="eyebrow">Staff workspace</p><h1 className="page-title !mt-1">Moderation</h1></div></div>
    <div className="grid gap-3 sm:grid-cols-3"><div className="card p-5"><p className="text-sm text-[var(--muted)]">Open reports</p><strong className="price mt-2 block text-3xl">{reports.length}</strong></div><div className="card p-5"><p className="text-sm text-[var(--muted)]">Removed today</p><strong className="price mt-2 block text-3xl">0</strong></div><div className="card p-5"><p className="text-sm text-[var(--muted)]">Average review time</p><strong className="price mt-2 block text-3xl">—</strong></div></div>
    <section className="mt-7 card overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--border)] p-5"><h2 className="font-bold">Reported listings</h2><span className="badge">{reports.length} open</span></div>{reports.length ? reports.map((report) => <div key={report.id} className="grid gap-4 border-b border-[var(--border)] p-5 transition last:border-0 hover:bg-white/[.018] sm:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-wide text-[#ff9ca6]">{report.reason}</p><strong className="mt-1 block">{report.listing?.title ?? "Unavailable listing"}</strong><p className="mt-1 text-sm text-[var(--muted)]">{report.details || "No additional details"}</p></div><AdminReportActions reportId={report.id} listingId={report.listing?.id ?? ""} /></div>) : <div className="empty-state"><div><span className="empty-state-icon"><AlertTriangle /></span><p className="mt-4 font-bold">Queue is clear</p><p className="mt-1 text-sm text-[var(--muted)]">No reports need review.</p></div></div>}</section>
  </div>;
}
