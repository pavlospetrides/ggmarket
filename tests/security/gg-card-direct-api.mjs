import { createHmac, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const apiUrl = process.env.LOCAL_API_URL;
const anonKey = process.env.LOCAL_ANON_KEY;
const serviceKey = process.env.LOCAL_SERVICE_ROLE_KEY;
const jwtSecret = process.env.LOCAL_JWT_SECRET;
if (!apiUrl || !anonKey || !serviceKey || !jwtSecret) throw new Error("Local Supabase test variables are required.");
const target = new URL(apiUrl);
if (!["127.0.0.1", "localhost", "::1"].includes(target.hostname)) throw new Error("Refusing to test a non-loopback Supabase target.");

const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const service = createClient(apiUrl, serviceKey, options);
const anonymous = createClient(apiUrl, anonKey, options);
const createdUsers = [];
let checks = 0;
function check(condition, message) {
  if (!condition) throw new Error(message);
  checks += 1;
  console.log(`PASS ${message}`);
}
function token(payload, secret) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const head = encode({ alg: "HS256", typ: "JWT" });
  const body = encode(payload);
  const signature = createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${signature}`;
}
async function createSyntheticUser(label) {
  const id = randomUUID();
  const email = `gg-card-${label}-${id}@example.invalid`;
  const password = `Local-${randomUUID()}!aA1`;
  const { data, error } = await service.auth.admin.createUser({
    id, email, password, email_confirm: true,
    user_metadata: { username: `card${label}`, display_name: `Card ${label.toUpperCase()}` },
  });
  if (error || !data.user) throw error ?? new Error("Synthetic user creation failed.");
  createdUsers.push(data.user.id);
  const client = createClient(apiUrl, anonKey, options);
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error || !signedIn.data.session) throw signedIn.error ?? new Error("Synthetic sign-in failed.");
  return { id: data.user.id, client };
}

try {
  const [accountA, accountB, suspended] = await Promise.all([
    createSyntheticUser("a"), createSyntheticUser("b"), createSyntheticUser("c"),
  ]);

  let result = await accountA.client.from("gg_cards").insert({ user_id: accountA.id, slogan: "Private A", theme_id: "gg-purple", is_public: false });
  check(!result.error, "direct API lets an active owner create their own card");
  result = await accountA.client.from("gg_cards").insert({ user_id: accountB.id, slogan: "Forged", theme_id: "gg-purple", is_public: false });
  check(Boolean(result.error), "direct API rejects forged ownership on insert");
  result = await accountB.client.from("gg_cards").select("user_id,slogan,theme_id,is_public").eq("user_id", accountA.id);
  check(!result.error && result.data?.length === 0, "direct API hides another account's private card");
  result = await accountB.client.from("gg_cards").update({ slogan: "Cross-account" }).eq("user_id", accountA.id).select("user_id");
  check(!result.error && result.data?.length === 0, "direct API cannot update another account's card");
  result = await anonymous.from("gg_cards").select("user_id,slogan,theme_id,is_public").eq("user_id", accountA.id);
  check(!result.error && result.data?.length === 0, "anonymous API hides private card data");

  result = await accountA.client.from("gg_cards").upsert({
    user_id: accountA.id,
    slogan: "Public A",
    theme_id: "crimson",
    is_public: true,
    text_color: "#112233",
    front_pattern_color: "#AaBbCc",
  });
  check(!result.error, "direct API owner upsert succeeds without changing ownership");
  result = await anonymous.from("gg_cards").select("user_id,slogan,theme_id,is_public,text_color,front_pattern_color").eq("user_id", accountA.id).single();
  check(
    !result.error && result.data?.slogan === "Public A" && result.data.text_color === "#112233" && result.data.front_pattern_color === "#AaBbCc",
    "anonymous API exposes validated public card presentation fields",
  );
  result = await anonymous.from("gg_cards").select("created_at").eq("user_id", accountA.id);
  check(Boolean(result.error), "anonymous API cannot select non-approved card columns");
  result = await anonymous.from("gg_cards").insert({ user_id: accountB.id, slogan: "Anonymous", theme_id: "gg-purple", is_public: true });
  check(Boolean(result.error), "anonymous API cannot insert cards");
  result = await anonymous.from("gg_cards").update({ slogan: "Anonymous" }).eq("user_id", accountA.id);
  check(Boolean(result.error), "anonymous API cannot update cards");
  result = await anonymous.from("gg_cards").delete().eq("user_id", accountA.id);
  check(Boolean(result.error), "anonymous API cannot delete cards");
  result = await accountA.client.from("gg_cards").delete().eq("user_id", accountA.id);
  check(Boolean(result.error), "owner API has no delete permission");
  result = await accountA.client.from("gg_cards").update({ user_id: accountB.id }).eq("user_id", accountA.id);
  check(Boolean(result.error), "direct API cannot alter card ownership");

  for (const [value, label] of [
    [{ theme_id: "url(javascript:alert(1))" }, "invalid theme"],
    [{ slogan: "x".repeat(81) }, "oversized slogan"],
    [{ slogan: "unsafe\ncontrol" }, "control-character slogan"],
    [{ text_color: "red" }, "invalid text color"],
    [{ front_pattern_color: "#123456;display:none" }, "invalid pattern color"],
  ]) {
    result = await accountA.client.from("gg_cards").update(value).eq("user_id", accountA.id);
    check(Boolean(result.error), `database constraint rejects ${label}`);
  }
  const hostile = `'); drop table public.gg_cards; -- <img src=x onerror=alert(1)>`;
  result = await accountA.client.from("gg_cards").update({ slogan: hostile }).eq("user_id", accountA.id).select("slogan").single();
  check(!result.error && result.data?.slogan === hostile, "SQL/XSS-like slogan round-trips as inert data");

  result = await suspended.client.from("gg_cards").insert({ user_id: suspended.id, slogan: "Before suspension", theme_id: "gg-purple", is_public: true });
  check(!result.error, "synthetic account can create a card before suspension");
  result = await service.from("profiles").update({ suspended_at: new Date().toISOString() }).eq("id", suspended.id);
  check(!result.error, "local service fixture suspends the synthetic account");
  result = await suspended.client.from("gg_cards").update({ slogan: "Suspended update" }).eq("user_id", suspended.id).select("user_id");
  check(Boolean(result.error) || result.data?.length === 0, "suspended account cannot update its card");
  result = await anonymous.from("gg_cards").select("user_id,slogan,theme_id,is_public").eq("user_id", suspended.id);
  check(!result.error && result.data?.length === 0, "suspended profile's public card is hidden");

  const now = Math.floor(Date.now() / 1000);
  const expired = token({ role: "authenticated", sub: accountA.id, aud: "authenticated", iat: now - 7200, exp: now - 3600 }, jwtSecret);
  const forged = token({ role: "authenticated", sub: accountA.id, aud: "authenticated", iat: now, exp: now + 3600 }, "wrong-local-secret");
  for (const [candidate, label] of [["not-a-jwt", "invalid"], [expired, "expired"], [forged, "forged"]]) {
    const response = await fetch(`${apiUrl}/rest/v1/gg_cards?select=user_id`, { headers: { apikey: anonKey, authorization: `Bearer ${candidate}` } });
    check(response.status === 401, `${label} authentication cannot access the Data API`);
  }
  console.log(`Direct API security checks passed: ${checks}`);
} finally {
  for (const id of createdUsers) await service.auth.admin.deleteUser(id);
}
