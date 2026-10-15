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
  const { data, count } = await supabase!.from("reports").select("id, reason, details, status, created_at, listing:listings(id,title,status)", { count: "exact" }).eq("status", "open").order("created_at", { ascending: false }).limit(50);
  const reports = (data ?? []) as unknown as ReportRow[];
  const openCount = count ?? reports.length;
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <div className="page-header flex min-w-0 items-center gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl border border-[#5d3038] bg-[#2e1b24] text-[#ff9ca6]"><Shield aria-hidden="true" /></span><div className="min-w-0"><p className="eyebrow">Staff workspace</p><h1 className="page-title !mt-1">Moderation</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{openCount} open {openCount === 1 ? "report" : "reports"}</p></div></div>
    <section className="card min-w-0 overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--border)] p-5"><h2 className="font-bold">Reported listings</h2><span className="badge">{openCount} open</span></div>{reports.length ? reports.map((report) => <div key={report.id} className="grid min-w-0 gap-4 border-b border-[var(--border)] p-5 transition last:border-0 hover:bg-white/[.018] sm:grid-cols-[minmax(0,1fr)_auto]"><div className="min-w-0 [overflow-wrap:anywhere]"><p className="text-xs font-bold uppercase tracking-wide text-[#ff9ca6]">{report.reason}</p><strong className="mt-1 block">{report.listing?.title ?? "Unavailable listing"}</strong><p className="mt-1 text-sm text-[var(--muted)]">{report.details || "No additional details"}</p></div><AdminReportActions reportId={report.id} listingId={report.listing?.id ?? ""} /></div>) : <div className="empty-state"><div><span className="empty-state-icon"><AlertTriangle aria-hidden="true" /></span><p className="mt-4 font-bold">Queue is clear</p><p className="mt-1 text-sm text-[var(--muted)]">No reports need review.</p></div></div>}</section>
  </div>;
}
