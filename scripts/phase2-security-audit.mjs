import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Supabase test environment is not configured");
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const { error: schemaError } = await admin.from("conversations").select("id").limit(1);
if (schemaError) throw new Error(`Phase 2 migration is not applied: ${schemaError.message}`);

const stamp = Date.now();
const password = `Gg!${crypto.randomUUID()}aA1`;
const results = [];
const users = [];
let listingId;
let conversationId;
let messageId;
let sellerId;
const record = (name, passed) => results.push({ name, passed });

try {
  for (const suffix of ["buyer", "outsider"]) {
    const created = await admin.auth.admin.createUser({ email: `ggmarket.p2.${suffix}.${stamp}@example.invalid`, password, email_confirm: true, user_metadata: { username: `p2_${suffix}_${String(stamp).slice(-7)}`.slice(0, 24), display_name: `P2 ${suffix}` } });
    if (created.error || !created.data.user) throw created.error ?? new Error("User creation failed");
    users.push(created.data.user);
  }
  const clients = await Promise.all(users.map(async (user) => { const client = createClient(url, anonKey, { auth: { persistSession: false } }); const signedIn = await client.auth.signInWithPassword({ email: user.email, password }); if (signedIn.error) throw signedIn.error; return client; }));
  const [buyerClient, outsiderClient] = clients;
  const listing = await admin.from("listings").select("id,seller_id").eq("status", "active").limit(1).single();
  if (listing.error) throw listing.error; listingId = listing.data.id; sellerId = listing.data.seller_id;

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
  record("participant can update own read receipt", !ownReadReceipt.error && ownReadReceipt.data?.last_read_at === ownReadAt);
  const foreignReadReceipt = await outsiderClient
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", users[0].id)
    .select("user_id");
  record("outsider cannot update participant read receipt", Boolean(foreignReadReceipt.error) || foreignReadReceipt.data.length === 0);
  const { data: outsiderRead, error: outsiderReadError } = await outsiderClient.from("conversations").select("id").eq("id", conversationId);
  record("outsider cannot read conversation", !outsiderReadError && outsiderRead.length === 0);
  const { error: directConversationError } = await buyerClient.from("conversations").insert({ listing_id: listingId, buyer_id: users[0].id, seller_id: sellerId });
  record("conversation creation is RPC-only", Boolean(directConversationError));
  const validMessage = await buyerClient.from("messages").insert({ conversation_id: conversationId, sender_id: users[0].id, body: "Authorization audit message", client_id: crypto.randomUUID() }).select("id").single(); messageId = validMessage.data?.id;
  record("participant can send message", !validMessage.error);
  const { error: spoofMessageError } = await buyerClient.from("messages").insert({ conversation_id: conversationId, sender_id: sellerId, body: "Spoofed sender", client_id: crypto.randomUUID() });
  record("participant cannot spoof message sender", Boolean(spoofMessageError));
  const { error: outsiderMessageError } = await outsiderClient.from("messages").insert({ conversation_id: conversationId, sender_id: users[1].id, body: "Outsider", client_id: crypto.randomUUID() });
  record("outsider cannot send message", Boolean(outsiderMessageError));
  const { error: outsiderOfferError } = await outsiderClient.rpc("create_offer", { target_conversation: conversationId, offer_amount: 1, parent_id: null });
  record("outsider cannot create offer", Boolean(outsiderOfferError));
  const { error: spoofSearchError } = await buyerClient.from("saved_searches").insert({ user_id: users[1].id, name: "Spoofed alert" });
  record("user cannot create another user's saved search", Boolean(spoofSearchError));
  const { data: foreignNotifications, error: notificationError } = await outsiderClient.from("notifications").select("id").eq("user_id", users[0].id);
  record("user cannot read another user's notifications", !notificationError && foreignNotifications.length === 0);
  const { error: foreignChallengeError } = await buyerClient.rpc("create_item_verification_challenge", { target_listing: listingId, challenge_hash: "a".repeat(64), challenge_hint: "12" });
  record("non-owner cannot create item verification challenge", Boolean(foreignChallengeError));
} finally {
  if (messageId) await admin.from("notifications").delete().eq("entity_id", messageId);
  if (conversationId) await admin.from("conversations").delete().eq("id", conversationId);
  for (const user of users) await admin.auth.admin.deleteUser(user.id);
}

for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}`);
if (results.some((result) => !result.passed)) process.exitCode = 2;
