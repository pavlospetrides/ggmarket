import { createClient } from "@supabase/supabase-js";
import { validateMutationEnvironment } from "./mutation-environment.mjs";

const { url, anonKey, serviceKey } = validateMutationEnvironment(process.env, { requireLocal: true });
const appUrl = new URL(process.env.SECURITY_AUDIT_APP_URL ?? "http://127.0.0.1:3000");
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(appUrl.hostname)) {
  throw new Error("Image upload testing requires a local application URL.");
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = Date.now();
const email = `ggmarket.qa.upload.${stamp}@example.invalid`;
const password = `Gg!${crypto.randomUUID()}aA1`;
let user;
let listingId;
let storagePath;
try {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username: `qa_upload_${stamp}`, display_name: "QA Upload" },
  });
  if (created.error) throw created.error;
  user = created.data.user;
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const signedIn = await client.auth.signInWithPassword({ email, password });
  if (signedIn.error) throw signedIn.error;
  const category = await admin.from("categories").select("id").eq("active", true).limit(1).single();
  const listing = await client.from("listings").insert({
    seller_id: user.id,
    category_id: category.data.id,
    title: `Upload QA ${stamp}`,
    description: "Temporary listing for trusted image upload testing.",
    price: 123,
    currency: "EUR",
    condition: "good",
    status: "draft",
    location: "QA City",
    shipping_available: true,
    meetup_available: false,
    attributes: {},
  }).select("id").single();
  if (listing.error) throw listing.error;
  listingId = listing.data.id;

  const loginBody = new URLSearchParams({ email, password, next: "/profile" });
  const login = await fetch(new URL("/auth/login", appUrl), {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      origin: appUrl.origin,
      "sec-fetch-site": "same-origin",
    },
    body: loginBody,
  });
  const cookies = login.headers.getSetCookie().map((value) => value.split(";", 1)[0]).join("; ");
  if (login.status !== 303 || !cookies) throw new Error("Local application login did not establish a test session.");

  const upload = async (bytes, declaredType) => {
    const form = new FormData();
    form.set("image", new Blob([bytes], { type: declaredType }), "audit.png");
    form.set("sortOrder", "0");
    return fetch(new URL(`/api/listings/${listingId}/images`, appUrl), {
      method: "POST",
      headers: { cookie: cookies, origin: appUrl.origin, "sec-fetch-site": "same-origin" },
      body: form,
    });
  };

  const spoofed = await upload(new TextEncoder().encode("not-an-image"), "image/png");
  const spoofedBody = await spoofed.json().catch(() => null);
  console.log(`${spoofed.status === 400 ? "PASS" : "FAIL"} trusted upload endpoint rejects spoofed image bytes (HTTP ${spoofed.status}${spoofedBody?.error ? `: ${spoofedBody.error}` : ""})`);

  const png = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
  const valid = await upload(png, "image/png");
  const validBody = await valid.json().catch(() => null);
  storagePath = validBody?.storage_path;
  const stored = storagePath ? await admin.storage.from("listing-images").download(storagePath) : null;
  console.log(`${valid.status === 201 && storagePath?.endsWith(".webp") && !stored?.error ? "PASS" : "FAIL"} trusted upload endpoint normalizes and stores a real image (HTTP ${valid.status}${validBody?.error ? `: ${validBody.error}` : ""})`);
  const activated = await client.from("listings").update({ status: "active" }).eq("id", listingId).select("id").single();
  const anonymous = createClient(url, anonKey, { auth: { persistSession: false } });
  const signed = storagePath ? await anonymous.storage.from("listing-images").createSignedUrl(storagePath, 60) : null;
  console.log(`${!activated.error && signed && !signed.error ? "PASS" : "FAIL"} anonymous marketplace reader can sign an active listing image${signed?.error ? ` (${signed.error.message})` : ""}`);
  const detail = await fetch(new URL(`/listing/${listingId}`, appUrl));
  const detailHtml = await detail.text();
  const hasTitle = detailHtml.includes(`Upload QA ${stamp}`);
  const hasError = detailHtml.includes("couldn") && detailHtml.includes("load this page");
  const detailWorks = detail.ok && hasTitle && !hasError;
  console.log(`${detailWorks ? "PASS" : "FAIL"} public listing page renders the normalized image (HTTP ${detail.status}; title=${hasTitle}; error=${hasError})`);
  if (spoofed.status !== 400 || valid.status !== 201 || !storagePath?.endsWith(".webp") || stored?.error || activated.error || signed?.error || !detailWorks) process.exitCode = 2;
} finally {
  if (storagePath) await admin.storage.from("listing-images").remove([storagePath]);
  if (listingId) await admin.from("listings").delete().eq("id", listingId);
  if (user) await admin.auth.admin.deleteUser(user.id);
}
