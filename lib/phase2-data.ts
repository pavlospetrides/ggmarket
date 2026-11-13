import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DataAccessError } from "@/lib/data";
import { getListing } from "@/lib/data";
import type { ChatMessage } from "@/lib/chat-state";
import { selectListingImagePath } from "@/lib/listing-media";
import { signAuthorizedListingImages } from "./listing-media-delivery";
import { createMediaStorage } from "./media-storage";
import { profileMediaBucket } from "./profile-media-storage";
import { signAuthorizedProfileMedia } from "./profile-media-delivery";

type Related<T> = T | T[] | null;
const one = <T,>(value: Related<T>): T | null => Array.isArray(value) ? value[0] ?? null : value;

export type ConversationSummary = {
  id: string; listingId: string; listingTitle: string; listingPrice: number; listingImage?: string;
  otherUserId: string; otherName: string; otherUsername: string; otherAvatarUrl?: string; lastMessage?: string;
  lastMessageAt: string; unread: number;
};

export type { ChatMessage } from "@/lib/chat-state";
export type ChatOffer = { id: string; createdBy: string; buyerId: string; sellerId: string; amount: number; currency: string; status: string; createdAt: string };
export type ChatTrade = { id: string; proposerId: string; recipientId: string; cashAdjustment: number; note?: string; status: string; offeredTitle?: string; createdAt: string };

export async function getConversations(userId: string): Promise<ConversationSummary[]> {
  const supabase = await createClient(); if (!supabase) throw new DataAccessError("connect to messages");
  const { data, error } = await supabase.from("conversations").select("id,listing_id,buyer_id,seller_id,last_message_at,listing:listings!conversations_listing_id_fkey(title,price,listing_images(storage_path,card_path,storage_provider,sort_order)),buyer:profiles!conversations_buyer_id_fkey(id,username,display_name,avatar_path),seller:profiles!conversations_seller_id_fkey(id,username,display_name,avatar_path),conversation_members!inner(last_read_at)").eq("conversation_members.user_id", userId).order("last_message_at", { ascending: false });
  if (error) throw new DataAccessError("load conversations");
  const ids = (data ?? []).map((row) => row.id);
  const { data: messageRows, error: messageError } = ids.length ? await supabase.from("messages").select("id,conversation_id,sender_id,body,created_at").in("conversation_id", ids).order("created_at", { ascending: false }).limit(500) : { data: [], error: null };
  if (messageError) throw new DataAccessError("load message previews");
  type ConversationImage = { storage_path: string; card_path: string | null; storage_provider?: string; sort_order: number };
  const prepared = (data ?? []).map((row) => {
    const listing = one(row.listing as Related<{ title: string; price: number; listing_images: ConversationImage[] }>);
    const other = one((row.buyer_id === userId ? row.seller : row.buyer) as Related<{ id: string; username: string; display_name: string; avatar_path: string | null }>);
    if (!listing || !other) return null;
    const messages = (messageRows ?? []).filter((message) => message.conversation_id === row.id);
    const membership = one(row.conversation_members as Related<{ last_read_at: string | null }>);
    const unread = messages.filter((message) => message.sender_id !== userId && (!membership?.last_read_at || message.created_at > membership.last_read_at)).length;
    const firstImage = listing.listing_images?.toSorted((left, right) => left.sort_order - right.sort_order)[0];
    const imagePath = firstImage ? selectListingImagePath(firstImage, "card") : undefined;
    return { row, listing, other, messages, unread, imagePath, provider: firstImage?.storage_provider };
  }).filter((item): item is NonNullable<typeof item> => item !== null);
  const selections = prepared.flatMap((item) => item.imagePath ? [{ path: item.imagePath, provider: item.provider }] : []);
  let signed: string[];
  try { signed = await signAuthorizedListingImages(selections, (provider) => createMediaStorage(provider, supabase)); }
  catch { throw new DataAccessError("load conversation images"); }
  const signedImages = new Map(selections.map((item, index) => [`${item.provider ?? "supabase"}:${item.path}`, signed[index]]));
  const profileSelections = prepared.map((item) => ({ ownerId: item.other.id, kind: "avatar" as const, path: item.other.avatar_path }));
  const signedAvatars = profileSelections.some((item) => item.path) ? await signAuthorizedProfileMedia(profileSelections, profileMediaBucket()) : profileSelections.map(() => undefined);
  return prepared.map(({ row, listing, other, messages, unread, imagePath, provider }, index) => ({
    id: row.id,
    listingId: row.listing_id,
    listingTitle: listing.title,
    listingPrice: Number(listing.price),
    listingImage: imagePath ? signedImages.get(`${provider ?? "supabase"}:${imagePath}`) : undefined,
    otherUserId: other.id,
    otherName: other.display_name,
    otherUsername: other.username,
    otherAvatarUrl: signedAvatars[index],
    lastMessage: messages[0]?.body,
    lastMessageAt: row.last_message_at,
    unread,
  }));
}

export async function getConversation(userId: string, id: string) {
  const supabase = await createClient(); if (!supabase) throw new DataAccessError("connect to conversation");
  const { data: row, error } = await supabase.from("conversations").select("id,listing_id,buyer_id,seller_id,listing:listings!conversations_listing_id_fkey(title,price,currency),buyer:profiles!conversations_buyer_id_fkey(id,username,display_name,avatar_path),seller:profiles!conversations_seller_id_fkey(id,username,display_name,avatar_path)").eq("id", id).maybeSingle();
  if (error) throw new DataAccessError("load conversation"); if (!row) return null;
  const other = one((row.buyer_id === userId ? row.seller : row.buyer) as Related<{ id: string; username: string; display_name: string; avatar_path: string | null }>);
  const listing = one(row.listing as Related<{ title: string; price: number; currency: string }>); if (!other || !listing) return null;
  const [{ data: messages, error: messageError }, { data: offers, error: offerError }, { data: trades, error: tradeError }, { data: ownListings }, { data: verification, error: verificationError }] = await Promise.all([
    supabase.from("messages").select("id,sender_id,body,client_id,created_at").eq("conversation_id", id).order("created_at").limit(500),
    supabase.from("offers").select("id,created_by,buyer_id,seller_id,amount,currency,status,created_at").eq("conversation_id", id).order("created_at").limit(100),
    supabase.from("trade_proposals").select("id,proposer_id,recipient_id,cash_adjustment,note,status,created_at,offered:listings!trade_proposals_offered_listing_id_fkey(title)").eq("conversation_id", id).order("created_at").limit(100),
    supabase.from("listings").select("id,title").eq("seller_id", userId).eq("status", "active").neq("id", row.listing_id).limit(50),
    supabase.from("seller_verifications").select("id").eq("seller_id", other.id).eq("status", "verified").limit(1).maybeSingle(),
  ]);
  if (messageError || offerError || tradeError || verificationError) throw new DataAccessError("load conversation activity");
  const otherAvatarUrl = other.avatar_path ? (await signAuthorizedProfileMedia([{ ownerId: other.id, kind: "avatar", path: other.avatar_path }], profileMediaBucket()))[0] : undefined;
  return {
    id, listingId: row.listing_id, listingTitle: listing.title, listingPrice: Number(listing.price), currency: listing.currency,
    other: { ...other, avatarUrl: otherAvatarUrl, verified: Boolean(verification) }, messages: (messages ?? []).map((item) => ({ id: item.id, senderId: item.sender_id, body: item.body, clientId: item.client_id, createdAt: item.created_at, status: "sent" } satisfies ChatMessage)),
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
