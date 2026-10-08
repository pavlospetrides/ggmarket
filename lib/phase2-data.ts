import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DataAccessError } from "@/lib/data";
import { getListing } from "@/lib/data";

type Related<T> = T | T[] | null;
const one = <T,>(value: Related<T>): T | null => Array.isArray(value) ? value[0] ?? null : value;

export type ConversationSummary = {
  id: string; listingId: string; listingTitle: string; listingPrice: number; listingImage?: string;
  otherUserId: string; otherName: string; otherUsername: string; lastMessage?: string;
  lastMessageAt: string; unread: number;
};

export type ChatMessage = { id: string; senderId: string; body: string; createdAt: string };
export type ChatOffer = { id: string; createdBy: string; buyerId: string; sellerId: string; amount: number; currency: string; status: string; createdAt: string };
export type ChatTrade = { id: string; proposerId: string; recipientId: string; cashAdjustment: number; note?: string; status: string; offeredTitle?: string; createdAt: string };

export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient(); if (!supabase) throw new DataAccessError("connect to messages");
  const { data, error } = await supabase.from("conversations").select("id,listing_id,buyer_id,seller_id,last_message_at,listing:listings!conversations_listing_id_fkey(title,price,listing_images(storage_path)),buyer:profiles!conversations_buyer_id_fkey(id,username,display_name),seller:profiles!conversations_seller_id_fkey(id,username,display_name),conversation_members!inner(last_read_at)").eq("conversation_members.user_id", userId).order("last_message_at", { ascending: false });
  if (error) throw new DataAccessError("load conversations");
  const ids = (data ?? []).map((row) => row.id);
  const { data: messageRows, error: messageError } = ids.length ? await supabase.from("messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(500) : { data: [], error: null };
  if (messageError) throw new DataAccessError("load message previews");
  return (data ?? []).flatMap((row) => {
    const listing = one(row.listing as Related<{ title: string; price: number; listing_images: { storage_path: string }[] }>);
    const other = one((row.buyer_id === userId ? row.seller : row.buyer) as Related<{ id: string; username: string; display_name: string }>);
    if (!listing || !other) return [];
    const messages = (messageRows ?? []).filter((message) => message.conversation_id === row.id);
    const membership = one(row.conversation_members as Related<{ last_read_at: string | null }>);
    const unread = messages.filter((message) => message.sender_id !== userId && (!membership?.last_read_at || message.created_at > membership.last_read_at)).length;
    const imagePath = listing.listing_images?.[0]?.storage_path;
    return [{ id: row.id, listingId: row.listing_id, listingTitle: listing.title, listingPrice: Number(listing.price), listingImage: imagePath ? supabase.storage.from("listing-images").getPublicUrl(imagePath).data.publicUrl : undefined, otherUserId: other.id, otherName: other.display_name, otherUsername: other.username, lastMessage: messages[0]?.body, lastMessageAt: row.last_message_at, unread }];
  });
}

export async function getConversation(userId: string, id: string) {
  const supabase = await createClient(); if (!supabase) throw new DataAccessError("connect to conversation");
  const { data: row, error } = await supabase.from("conversations").select("id,listing_id,buyer_id,seller_id,listing:listings!conversations_listing_id_fkey(title,price,currency),buyer:profiles!conversations_buyer_id_fkey(id,username,display_name),seller:profiles!conversations_seller_id_fkey(id,username,display_name)").eq("id", id).maybeSingle();
  if (error) throw new DataAccessError("load conversation"); if (!row) return null;
  const other = one((row.buyer_id === userId ? row.seller : row.buyer) as Related<{ id: string; username: string; display_name: string }>);
  const listing = one(row.listing as Related<{ title: string; price: number; currency: string }>); if (!other || !listing) return null;
  const [{ data: messages, error: messageError }, { data: offers, error: offerError }, { data: trades, error: tradeError }, { data: ownListings }] = await Promise.all([
    supabase.from("messages").select("id,sender_id,body,created_at").eq("conversation_id", id).order("created_at").limit(500),
    supabase.from("offers").select("id,created_by,buyer_id,seller_id,amount,currency,status,created_at").eq("conversation_id", id).order("created_at").limit(100),
    supabase.from("trade_proposals").select("id,proposer_id,recipient_id,cash_adjustment,note,status,created_at,offered:listings!trade_proposals_offered_listing_id_fkey(title)").eq("conversation_id", id).order("created_at").limit(100),
    supabase.from("listings").select("id,title").eq("seller_id", userId).eq("status", "active").neq("id", row.listing_id).limit(50),
  ]);
  if (messageError || offerError || tradeError) throw new DataAccessError("load conversation activity");
  return {
    id, listingId: row.listing_id, listingTitle: listing.title, listingPrice: Number(listing.price), currency: listing.currency,
    other, messages: (messages ?? []).map((item) => ({ id: item.id, senderId: item.sender_id, body: item.body, createdAt: item.created_at } satisfies ChatMessage)),
    offers: (offers ?? []).map((item) => ({ id: item.id, createdBy: item.created_by, buyerId: item.buyer_id, sellerId: item.seller_id, amount: Number(item.amount), currency: item.currency, status: item.status, createdAt: item.created_at } satisfies ChatOffer)),
    trades: (trades ?? []).map((item) => ({ id: item.id, proposerId: item.proposer_id, recipientId: item.recipient_id, cashAdjustment: Number(item.cash_adjustment), note: item.note ?? undefined, status: item.status, offeredTitle: one(item.offered as Related<{ title: string }>)?.title, createdAt: item.created_at } satisfies ChatTrade)),
    ownListings: ownListings ?? [],
  };
}

export async function getNotifications(userId: string) {
  const supabase = await createClient(); if (!supabase) throw new DataAccessError("connect to notifications");
  const { data, error } = await supabase.from("notifications").select("id,type,title,body,href,read_at,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(80);
  if (error) throw new DataAccessError("load notifications"); return data ?? [];
}

export async function getSavedSearches(userId: string) {
  const supabase = await createClient(); if (!supabase) throw new DataAccessError("connect to saved searches");
  const { data, error } = await supabase.from("saved_searches").select("id,name,search_term,category_id,condition,intent,min_price,max_price,location,enabled,created_at").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw new DataAccessError("load saved searches"); return data ?? [];
}

export async function getRecentlyViewed(userId: string) {
  const supabase = await createClient(); if (!supabase) return [];
  const { data, error } = await supabase.from("recently_viewed").select("listing_id").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(6);
  if (error) return []; const items = await Promise.all((data ?? []).map((item) => getListing(item.listing_id))); return items.filter((item) => item !== null);
}
