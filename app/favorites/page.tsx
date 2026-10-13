import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ListingGrid } from "@/components/listing-grid";
import { requireUser } from "@/lib/auth";
import { getFavoriteListings } from "@/lib/data";
export const metadata: Metadata = { title: "Favorites", robots: { index: false } };
export default async function FavoritesPage() { const user = await requireUser("/favorites"); const items = await getFavoriteListings(user.id); return <div className="container-page py-8 md:py-12"><div className="page-header flex items-center gap-3"><span className="grid size-12 place-items-center rounded-xl border border-[#463871] bg-[#211936] text-[#b4a3ff]"><Heart /></span><div><p className="eyebrow">Saved for later</p><h1 className="page-title !mt-1">Favorites</h1></div></div><div>{items.length ? <ListingGrid listings={items} /> : <div className="card empty-state"><div><span className="empty-state-icon"><Heart /></span><h2 className="mt-4 text-xl font-bold">Nothing saved yet</h2><p className="mt-2 text-[var(--muted)]">Tap the heart on any listing to keep it here.</p><Link className="btn-primary mt-5" href="/marketplace">Explore listings</Link></div></div>}</div></div>; }
