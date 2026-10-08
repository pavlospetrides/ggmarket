import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) throw new Error("Supabase test environment is not configured");
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = Date.now(); const password = `Gg!${crypto.randomUUID()}aA1`;
const emailA = `ggmarket.qa.a.${stamp}@example.invalid`; const emailB = `ggmarket.qa.b.${stamp}@example.invalid`;
const results = []; let userA; let userB;
const record = (name, passed, detail = "") => results.push({ name, passed, detail });
try {
  const createdA = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true, user_metadata: { username: `qa_a_${stamp}`, display_name: "QA User A" } }); if (createdA.error) throw createdA.error; userA = createdA.data.user;
  const createdB = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true, user_metadata: { username: `qa_b_${stamp}`, display_name: "QA User B" } }); if (createdB.error) throw createdB.error; userB = createdB.data.user;
  const clientA = createClient(url, anonKey, { auth: { persistSession: false } }); const clientB = createClient(url, anonKey, { auth: { persistSession: false } });
  if ((await clientA.auth.signInWithPassword({ email: emailA, password })).error || (await clientB.auth.signInWithPassword({ email: emailB, password })).error) throw new Error("Test sign-in failed");
  const { data: category } = await admin.from("categories").select("id").eq("active", true).limit(1).single();
  const { data: publicListing, error: publicListingError } = await admin.from("listings").select("id").eq("status", "active").limit(1).single(); if (publicListingError) throw publicListingError;
  const { data: ownProfile, error: ownProfileError } = await clientA.from("profiles").update({ display_name: "QA User A Updated", username: `qa_a_updated_${stamp}`.slice(0, 24) }).eq("id", userA.id).select("display_name").single(); record("owner can update profile", !ownProfileError && ownProfile?.display_name === "QA User A Updated");
  const { data: crossProfile, error: crossProfileError } = await clientB.from("profiles").update({ display_name: "Tampered" }).eq("id", userA.id).select("id"); record("other user cannot update profile", !crossProfileError && crossProfile?.length === 0);
  const { error: escalateError } = await clientB.from("profiles").update({ is_admin: true }).eq("id", userB.id); record("user cannot self-promote to admin", Boolean(escalateError));
  await admin.from("profiles").update({ suspended_at: new Date().toISOString() }).eq("id", userB.id); const { error: clearSuspensionError } = await clientB.from("profiles").update({ suspended_at: null }).eq("id", userB.id); record("user cannot clear own suspension", Boolean(clearSuspensionError), clearSuspensionError ? "blocked" : "CURRENT_SCHEMA_VULNERABLE"); await admin.from("profiles").update({ suspended_at: null }).eq("id", userB.id);
  const { data: listing, error: listingError } = await clientA.from("listings").insert({ seller_id: userA.id, category_id: category.id, title: `GGMarket QA Listing ${stamp}`, description: "Temporary automated authorization test listing.", price: 123, currency: "EUR", condition: "good", status: "draft", location: "QA City", shipping_available: true, meetup_available: false, attributes: {} }).select("id").single(); if (listingError) throw listingError;
  const { data: crossListing, error: crossListingError } = await clientB.from("listings").update({ price: 1 }).eq("id", listing.id).select("id"); record("other user cannot edit listing", !crossListingError && crossListing?.length === 0);
  const { data: crossDelete, error: crossDeleteError } = await clientB.from("listings").delete().eq("id", listing.id).select("id"); record("other user cannot delete listing", !crossDeleteError && crossDelete?.length === 0);
  const { error: transferError } = await clientA.from("listings").update({ seller_id: userB.id }).eq("id", listing.id); record("owner cannot transfer seller identity", Boolean(transferError));
  const { error: favoriteError } = await clientB.from("favorites").insert({ user_id: userB.id, listing_id: publicListing.id }); record("user can favorite another listing", !favoriteError); const { error: foreignFavoriteError } = await clientB.from("favorites").insert({ user_id: userA.id, listing_id: publicListing.id }); record("user cannot create favorite for another user", Boolean(foreignFavoriteError));
  const { error: reportError } = await clientB.from("reports").insert({ reporter_id: userB.id, listing_id: publicListing.id, reason: "spam", status: "actioned", moderated_by: userA.id }); record("user cannot set moderation fields on report insert", Boolean(reportError), reportError ? "blocked" : "CURRENT_SCHEMA_VULNERABLE");
  const { error: verificationError } = await clientB.from("seller_verifications").insert({ seller_id: userB.id, status: "verified" }); record("user cannot self-verify", Boolean(verificationError));
  const { error: crossStorageError } = await clientB.storage.from("listing-images").upload(`${userA.id}/${listing.id}/tamper.png`, new Blob(["not-an-image"], { type: "image/png" })); record("user cannot upload into another user's folder", Boolean(crossStorageError));
} finally {
  const ids = [userA?.id, userB?.id].filter(Boolean); if (ids.length) { await admin.from("reports").delete().in("reporter_id", ids); await admin.from("reports").delete().in("moderated_by", ids); await admin.from("listings").delete().in("seller_id", ids); }
  if (userA) await admin.auth.admin.deleteUser(userA.id); if (userB) await admin.auth.admin.deleteUser(userB.id);
}
for (const result of results) console.log(`${result.passed ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` (${result.detail})` : ""}`);
if (results.some((result) => !result.passed)) process.exitCode = 2;
