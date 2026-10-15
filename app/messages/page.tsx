import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { formatPrice } from "@/lib/constants";
import { getConversations } from "@/lib/phase2-data";

export const metadata: Metadata = { title: "Messages", robots: { index: false } };

export default async function MessagesPage() {
  const user = await requireUser("/messages");
  const conversations = await getConversations(user.id);

  return <div className="container-page min-w-0 pb-28 pt-6 md:pb-10 md:pt-10">
    <div className="page-header"><p className="eyebrow">Inbox</p><h1 className="page-title">Messages</h1></div>
    <div className="card min-h-[65vh] min-w-0 overflow-hidden md:grid md:grid-cols-[360px_minmax(0,1fr)]">
      <section className="min-w-0 md:border-r md:border-[var(--border)]" aria-label="Conversations">
        <div className="border-b border-[var(--border)] p-4 font-bold">Conversations</div>
        {conversations.length ? <div>{conversations.map((item) => <Link key={item.id} href={`/messages/${item.id}`} className="flex min-h-24 min-w-0 gap-3 border-b border-[var(--border)] p-4 transition hover:bg-[var(--surface-alt)]">
          {item.listingImage ? <Image src={item.listingImage} alt="" width={56} height={56} className="size-14 shrink-0 rounded-xl object-cover" /> : <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--surface-alt)]"><MessageCircle aria-hidden="true" /></span>}
          <span className="min-w-0 flex-1"><span className="flex min-w-0 justify-between gap-2"><strong className="truncate">{item.otherName}</strong><small className="shrink-0 text-[var(--muted)]">{new Date(item.lastMessageAt).toLocaleDateString()}</small></span><span className="mt-1 block truncate text-xs text-[#b6a8ff]">{item.listingTitle} · {formatPrice(item.listingPrice)}</span><span className="mt-1 flex min-w-0 items-center gap-2"><span className="min-w-0 flex-1 truncate text-sm text-[var(--muted)]">{item.lastMessage || "Start the conversation"}</span>{item.unread > 0 && <span className="shrink-0 rounded-full bg-[var(--brand)] px-2 py-0.5 text-xs font-bold">{item.unread}</span>}</span></span>
        </Link>)}</div> : <div className="empty-state"><div><span className="empty-state-icon"><MessageCircle aria-hidden="true" /></span><h2 className="mt-4 font-bold">No conversations yet</h2><p className="mt-2 text-sm text-[var(--muted)]">Message a seller from any listing.</p><Link href="/marketplace" className="btn-primary mt-5">Browse listings</Link></div></div>}
      </section>
      <div className="hidden min-w-0 place-items-center p-8 text-center text-[var(--muted)] md:grid"><div><span className="empty-state-icon"><MessageCircle aria-hidden="true" /></span><p className="mt-4">Choose a conversation to start chatting.</p></div></div>
    </div>
  </div>;
}
