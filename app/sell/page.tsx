import type { Metadata } from "next";
import { SellWizard } from "@/components/sell-wizard";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
export const metadata: Metadata = { title: "Sell an item", robots: { index: false } };
export default async function SellPage() { await requireUser("/sell"); const categories = await getCategories(); return <div className="container-page py-8 md:py-12"><div className="page-header mx-auto max-w-3xl"><p className="eyebrow">Create a listing</p><h1 className="page-title">Sell your gaming gear</h1><p className="page-description">Clear steps, buyer-ready details, and a polished preview before you publish.</p></div><SellWizard categories={categories} /></div>; }
