import type { Metadata } from "next";
import { SellWizard } from "@/components/sell-wizard";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";
export const metadata: Metadata = { title: "Sell an item", robots: { index: false } };
export default async function SellPage() { await requireUser("/sell"); const categories = await getCategories(); return <div className="container-page py-8 md:py-12"><div className="mb-7"><p className="eyebrow">Create a listing</p><h1 className="mt-2 text-3xl font-black">Sell your gaming gear</h1></div><SellWizard categories={categories} /></div>; }
