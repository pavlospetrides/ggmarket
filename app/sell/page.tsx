import type { Metadata } from "next";
import { SellWizard } from "@/components/sell-wizard";
import { PageMasthead } from "@/components/page-masthead";
import { requireUser } from "@/lib/auth";
import { getCategories } from "@/lib/data";

export const metadata: Metadata = { title: "Sell an item", robots: { index: false } };

export default async function SellPage() {
  await requireUser("/sell");
  const categories = await getCategories();
  return <div className="container-page min-w-0 pb-28 pt-8 md:pb-12 md:pt-12">
    <PageMasthead eyebrow="Create a listing" title="Put your gear back in play" description="Clear steps, buyer-ready details, and a polished preview before you publish." variant="commerce" meta={<><span>01 / Describe</span><span>02 / Price</span><span>03 / Publish</span></>} />
    <SellWizard categories={categories} />
  </div>;
}
