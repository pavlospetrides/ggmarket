import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ListingGrid } from "@/components/listing-grid";
import { requireUser } from "@/lib/auth";
import { getFavoriteListings } from "@/lib/data";
export const metadata: Metadata = { title: "Favorites", robots: { index: false } };
export default async function FavoritesPage() { const user = await requireUser("/favorites"); const items = await getFavoriteListings(user.id); return <div className="container-page py-10"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-[#221936] text-[#b4a3ff]"><Heart /></span><div><p className="eyebrow">Saved for later</p><h1 className="text-3xl font-black">Favorites</h1></div></div><div className="mt-8">{items.length ? <ListingGrid listings={items} /> : <div className="card grid min-h-72 place-items-center p-8 text-center"><div><Heart className="mx-auto size-9 text-[var(--muted)]" /><h2 className="mt-4 text-xl font-bold">Nothing saved yet</h2><p className="mt-2 text-[var(--muted)]">Tap the heart on any listing to keep it here.</p><Link className="btn-primary mt-5" href="/marketplace">Explore listings</Link></div></div>}</div></div>; }
