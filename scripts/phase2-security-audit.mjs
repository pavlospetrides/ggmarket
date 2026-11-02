import { createClient } from "@supabase/supabase-js";
import { validateMutationEnvironment } from "./mutation-environment.mjs";

const { url, anonKey, serviceKey } = validateMutationEnvironment(process.env, { requireLocal: true });
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: schemaError } = await admin.from("conversations").select("id").limit(1);
if (schemaError) throw new Error(`Phase 2 migration is not applied: ${schemaError.message}`);

const stamp = Date.now();
const password = `Gg!${crypto.randomUUID()}aA1`;
const results = [];
const users = [];
let clients = [];
let listingId;
let conversationId;
let messageId;
let offerId;
let oversizedOfferId;
let sellerId;
let targetListingId;
let offeredListingId;
const record = (name, passed, detail = "") => results.push({ name, passed, detail });
async function subscriptionStatus(client, topic) {
  const channel = client.channel(topic, { config: { private: true } });
  let timer;
  const status = await new Promise((resolve) => {
    let settled = false;
    timer = setTimeout(() => { if (!settled) { settled = true; resolve("TIMED_OUT"); } }, 8_000);
    channel.subscribe((nextStatus) => {
      if (!settled && ["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT"].includes(nextStatus)) {
        settled = true; resolve(nextStatus);
      }
    });
  });
  clearTimeout(timer);
  await client.removeChannel(channel);
  return status;
}
async function observePostgresInsert(client, table, filter, action) {
  const channel = client.channel(`audit:${table}:${crypto.randomUUID()}`);
  let resolveEvent;
  const event = new Promise((resolve) => { resolveEvent = resolve; });
  channel.on("postgres_changes", { event: "INSERT", schema: "public", table, filter }, (payload) => resolveEvent(payload));
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${table} subscription timed out`)), 10_000);
    channel.subscribe((status) => { if (status === "SUBSCRIBED") { clearTimeout(timer); resolve(); } });
  });
  const result = await action();
  const payload = await Promise.race([event, new Promise((resolve) => setTimeout(() => resolve(null), 10_000))]);
  await client.removeChannel(channel);
  return { result, payload };
}

try {
  for (const suffix of ["buyer", "outsider", "seller"]) {
    const created = await admin.auth.admin.createUser({ email: `ggmarket.p2.${suffix}.${stamp}@example.invalid`, password, email_confirm: true, user_metadata: { username: `p2_${suffix}_${String(stamp).slice(-7)}`.slice(0, 24), display_name: `P2 ${suffix}` } });
    if (created.error || !created.data.user) throw created.error ?? new Error("User creation failed");
    users.push(created.data.user);
  }
  clients = await Promise.all(users.map(async (user) => { const client = createClient(url, anonKey, { auth: { persistSession: false } }); const signedIn = await client.auth.signInWithPassword({ email: user.email, password }); if (signedIn.error) throw signedIn.error; return client; }));
  const [buyerClient, outsiderClient, sellerClient] = clients;
  const category = await admin.from("categories").select("id").eq("active", true).limit(1).single();
  if (category.error) throw category.error;
  const targetListing = await admin.from("listings").insert({ seller_id: users[2].id, category_id: category.data.id, title: `Phase 2 target ${stamp}`, description: "Controlled target listing for phase two authorization verification.", price: 500, currency: "EUR", condition: "good", status: "active", location: "QA City", shipping_available: true, meetup_available: false, attributes: {} }).select("id,seller_id").single();
  if (targetListing.error) throw targetListing.error;
  targetListingId = targetListing.data.id; listingId = targetListing.data.id; sellerId = targetListing.data.seller_id;
  const offeredListing = await admin.from("listings").insert({ seller_id: users[0].id, category_id: category.data.id, title: `Phase 2 offered ${stamp}`, description: "Controlled offered listing for phase two authorization verification.", price: 300, currency: "EUR", condition: "good", status: "active", location: "QA City", shipping_available: true, meetup_available: false, attributes: {} }).select("id").single();
  if (offeredListing.error) throw offeredListing.error;
  offeredListingId = offeredListing.data.id;

  const started = await buyerClient.rpc("start_conversation", { target_listing_id: listingId });
  if (started.error) throw started.error; conversationId = started.data;
  const ownReadAt = new Date().toISOString();
  const ownReadReceipt = await buyerClient
    .from("conversation_members")
    .update({ last_read_at: ownReadAt })
    .eq("conversation_id", conversationId)
    .eq("user_id", users[0].id)
    .select("last_read_at")
    .single();
  const readReceiptMatches = !ownReadReceipt.error && ownReadReceipt.data?.last_read_at && new Date(ownReadReceipt.data.last_read_at).getTime() === new Date(ownReadAt).getTime();
  record("participant can update own read receipt", Boolean(readReceiptMatches), ownReadReceipt.error ? `${ownReadReceipt.error.code}: ${ownReadReceipt.error.message}` : ownReadReceipt.data?.last_read_at ? "timestamp normalized by PostgreSQL" : "no updated row returned");
  const foreignReadReceipt = await outsiderClient
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", users[0].id)
    .select("user_id");
  record("outsider cannot update participant read receipt", Boolean(foreignReadReceipt.error) || foreignReadReceipt.data.length === 0);
  const { data: outsiderRead, error: outsiderReadError } = await outsiderClient.from("conversations").select("id").eq("id", conversationId);
  record("outsider cannot read conversation", !outsiderReadError && outsiderRead.length === 0);
  const { data: outsiderMembers, error: outsiderMembersError } = await outsiderClient.from("conversation_members").select("user_id").eq("conversation_id", conversationId);
  record("outsider cannot read conversation membership", !outsiderMembersError && outsiderMembers.length === 0);
  const participantRealtime = await subscriptionStatus(buyerClient, `conversation:${conversationId}`);
  record("participant can subscribe to private conversation channel", participantRealtime === "SUBSCRIBED");
  const outsiderRealtime = await subscriptionStatus(outsiderClient, `conversation:${conversationId}`);
  record("outsider cannot subscribe to private conversation channel", outsiderRealtime !== "SUBSCRIBED");
  const { error: directConversationError } = await buyerClient.from("conversations").insert({ listing_id: listingId, buyer_id: users[0].id, seller_id: sellerId });
  record("conversation creation is RPC-only", Boolean(directConversationError));
  const validMessage = await buyerClient.from("messages").insert({ conversation_id: conversationId, sender_id: users[0].id, body: "Authorization audit message", client_id: crypto.randomUUID() }).select("id").single(); messageId = validMessage.data?.id;
  record("participant can send message", !validMessage.error);
  const outsiderMessages = await outsiderClient.from("messages").select("id,body").eq("conversation_id", conversationId);
  record("outsider cannot read messages", !outsiderMessages.error && outsiderMessages.data.length === 0);
  const { error: spoofMessageError } = await buyerClient.from("messages").insert({ conversation_id: conversationId, sender_id: sellerId, body: "Spoofed sender", client_id: crypto.randomUUID() });
  record("participant cannot spoof message sender", Boolean(spoofMessageError));
  const { error: outsiderMessageError } = await outsiderClient.from("messages").insert({ conversation_id: conversationId, sender_id: users[1].id, body: "Outsider", client_id: crypto.randomUUID() });
  record("outsider cannot send message", Boolean(outsiderMessageError));
  const emptyMessage = await buyerClient.from("messages").insert({ conversation_id: conversationId, sender_id: users[0].id, body: "   ", client_id: crypto.randomUUID() });
  record("empty messages are rejected", Boolean(emptyMessage.error));
  const oversizedMessage = await buyerClient.from("messages").insert({ conversation_id: conversationId, sender_id: users[0].id, body: "x".repeat(2001), client_id: crypto.randomUUID() });
  record("oversized messages are rejected", Boolean(oversizedMessage.error));
  const { error: outsiderOfferError } = await outsiderClient.rpc("create_offer", { target_conversation: conversationId, offer_amount: 1, parent_id: null });
  record("outsider cannot create offer", Boolean(outsiderOfferError));
  const observedOffer = await observePostgresInsert(buyerClient, "offers", `conversation_id=eq.${conversationId}`, () => buyerClient.rpc("create_offer", { target_conversation: conversationId, offer_amount: 123, parent_id: null }));
  const validOffer = observedOffer.result;
  offerId = validOffer.data?.id; record("participant can create bounded offer", !validOffer.error);
  record("participant receives offer Postgres Changes event", Boolean(observedOffer.payload));
  const outsiderOffers = await outsiderClient.from("offers").select("id,amount").eq("conversation_id", conversationId);
  record("outsider cannot read offers", !outsiderOffers.error && outsiderOffers.data.length === 0);
  const oversizedOffer = await buyerClient.rpc("create_offer", { target_conversation: conversationId, offer_amount: 1000000.01, parent_id: null });
  oversizedOfferId = oversizedOffer.data?.id; record("offers above application limit are rejected", Boolean(oversizedOffer.error));
  const { error: spoofSearchError } = await buyerClient.from("saved_searches").insert({ user_id: users[1].id, name: "Spoofed alert" });
  record("user cannot create another user's saved search", Boolean(spoofSearchError));
  const { data: foreignNotifications, error: notificationError } = await outsiderClient.from("notifications").select("id").eq("user_id", users[0].id);
  record("user cannot read another user's notifications", !notificationError && foreignNotifications.length === 0);
  const { error: foreignChallengeError } = await buyerClient.rpc("create_item_verification_challenge", { target_listing: listingId, challenge_hash: "a".repeat(64), challenge_hint: "12" });
  record("non-owner cannot create item verification challenge", Boolean(foreignChallengeError));
  const outsiderTrade = await outsiderClient.rpc("create_trade_proposal", { target_conversation: conversationId, offered_listing: offeredListingId, cash: 10, proposal_note: "Outsider" });
  record("outsider cannot create trade proposal", Boolean(outsiderTrade.error));
  const oversizedTrade = await buyerClient.rpc("create_trade_proposal", { target_conversation: conversationId, offered_listing: offeredListingId, cash: 1000000.01, proposal_note: "Too large" });
  record("trade cash adjustments above application limit are rejected", Boolean(oversizedTrade.error));
  const validTrade = await buyerClient.rpc("create_trade_proposal", { target_conversation: conversationId, offered_listing: offeredListingId, cash: 250, proposal_note: "Authorization audit trade" });
  record("participant can create valid trade proposal", !validTrade.error);
  const tradeId = validTrade.data?.id;
  const outsiderTrades = await outsiderClient.from("trade_proposals").select("id").eq("conversation_id", conversationId);
  record("outsider cannot read trade proposals", !outsiderTrades.error && outsiderTrades.data.length === 0);
  const creatorAccept = await buyerClient.rpc("respond_to_trade", { target_proposal: tradeId, action: "accepted" });
  record("trade proposer cannot accept own proposal", Boolean(creatorAccept.error));
  const outsiderAccept = await outsiderClient.rpc("respond_to_trade", { target_proposal: tradeId, action: "accepted" });
  record("outsider cannot change trade state", Boolean(outsiderAccept.error));
  const recipientAccept = await sellerClient.rpc("respond_to_trade", { target_proposal: tradeId, action: "accepted" });
  record("trade recipient can accept pending proposal", !recipientAccept.error && recipientAccept.data?.status === "accepted");
  const repeatedTransition = await sellerClient.rpc("respond_to_trade", { target_proposal: tradeId, action: "declined" });
  record("completed trade cannot transition again", Boolean(repeatedTransition.error));
  const reviewInsert = await buyerClient.from("reviews").insert({ listing_id: listingId, reviewer_id: users[0].id, seller_id: sellerId, rating: 5, comment: "Unavailable mutation audit" });
  record("review creation is explicitly unavailable", Boolean(reviewInsert.error));
} finally {
  if (messageId) await admin.from("notifications").delete().eq("entity_id", messageId);
  if (offerId) await admin.from("notifications").delete().eq("entity_id", offerId);
  if (oversizedOfferId) await admin.from("notifications").delete().eq("entity_id", oversizedOfferId);
  if (conversationId) await admin.from("conversations").delete().eq("id", conversationId);
  if (offeredListingId) await admin.from("listings").delete().eq("id", offeredListingId);
  if (targetListingId) await admin.from("listings").delete().eq("id", targetListingId);
  for (const client of clients) { await client.removeAllChannels(); client.realtime.disconnect(); }
  for (const user of users) await admin.auth.admin.deleteUser(user.id);
}

for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
if (results.some((result) => !result.passed)) process.exitCode = 2;
