import { expect, test, type Page } from "@playwright/test";
import { createClient, type User } from "@supabase/supabase-js";
import { requireMutationEnvironment } from "./mutation-guard";

const { url, anonKey, serviceKey } = requireMutationEnvironment();
const configuredAdminEmail = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim())
  .find(Boolean);
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const stamp = Date.now();
const password = `Gg!${crypto.randomUUID()}aA1`;
let adminUser: User;
let reporterUser: User;
let listingId = "";
let reportId = "";

async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/profile/);
}

test.beforeAll(async () => {
  if (!configuredAdminEmail || (!configuredAdminEmail.endsWith(".invalid") && !configuredAdminEmail.endsWith("@example.com")))
    throw new Error("ADMIN_EMAILS must contain a disposable example-domain acceptance-test address");
  const existing = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error) throw existing.error;
  if (existing.data.users.some((user) => user.email?.toLowerCase() === configuredAdminEmail.toLowerCase()))
    throw new Error("Configured disposable admin account already exists");

  const createdAdmin = await admin.auth.admin.createUser({
    email: configuredAdminEmail,
    password,
    email_confirm: true,
    user_metadata: { username: `audit_admin_${String(stamp).slice(-7)}`, display_name: "Audit Admin" },
  });
  if (createdAdmin.error || !createdAdmin.data.user) throw createdAdmin.error;
  adminUser = createdAdmin.data.user;
  const elevated = await admin.from("profiles").update({ is_admin: true }).eq("id", adminUser.id);
  if (elevated.error) throw elevated.error;

  const createdReporter = await admin.auth.admin.createUser({
    email: `ggmarket.moderation.reporter.${stamp}@example.invalid`,
    password,
    email_confirm: true,
    user_metadata: { username: `audit_reporter_${String(stamp).slice(-7)}`, display_name: "Audit Reporter" },
  });
  if (createdReporter.error || !createdReporter.data.user) throw createdReporter.error;
  reporterUser = createdReporter.data.user;
  const category = await admin.from("categories").select("id").eq("active", true).limit(1).single();
  if (category.error) throw category.error;
  const listing = await admin.from("listings").insert({ seller_id: reporterUser.id, category_id: category.data.id, title: `Moderation acceptance ${stamp}`, description: "Controlled active listing for the moderation acceptance test.", price: 100, currency: "EUR", condition: "good", status: "active", location: "QA City", shipping_available: true, meetup_available: false, attributes: {} }).select("id").single();
  if (listing.error) throw listing.error;
  listingId = listing.data.id;
  const report = await admin.from("reports").insert({ reporter_id: reporterUser.id, listing_id: listingId, reason: "other", details: "Controlled moderation acceptance report" }).select("id").single();
  if (report.error) throw report.error;
  reportId = report.data.id;
});

test.afterAll(async () => {
  if (reportId) await admin.from("moderation_audit_logs").delete().or(`target_id.eq.${reportId},target_id.eq.${listingId}`);
  if (reportId) await admin.from("notifications").delete().eq("entity_id", reportId);
  if (reportId) await admin.from("reports").delete().eq("id", reportId);
  if (listingId) await admin.from("listings").delete().eq("id", listingId);
  if (adminUser) await admin.auth.admin.deleteUser(adminUser.id);
  if (reporterUser) await admin.auth.admin.deleteUser(reporterUser.id);
});

test("admin removes a reported listing and creates an immutable audit record", async ({ browser }) => {
  const reporterClient = createClient(url, anonKey, { auth: { persistSession: false } });
  const signedIn = await reporterClient.auth.signInWithPassword({ email: reporterUser.email!, password });
  if (signedIn.error) throw signedIn.error;
  const denied = await reporterClient.rpc("moderate_report", { target_report: reportId, target_listing: listingId, decision: "remove" });
  expect(denied.error).toBeTruthy();

  const context = await browser.newContext();
  const page = await context.newPage();
  try {
    await login(page, configuredAdminEmail!);
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Moderation" })).toBeVisible();
    await expect(page.getByText(`Moderation acceptance ${stamp}`)).toBeVisible();
    await page.getByRole("button", { name: "Remove listing" }).click();
    await expect(page.getByText(`Moderation acceptance ${stamp}`)).toBeHidden();
  } finally {
    await context.close();
  }

  const report = await admin.from("reports").select("status,moderated_by,moderated_at").eq("id", reportId).single();
  expect(report.data?.status).toBe("actioned");
  expect(report.data?.moderated_by).toBe(adminUser.id);
  expect(Date.parse(report.data!.moderated_at!)).toBeGreaterThan(stamp);
  const listing = await admin.from("listings").select("status").eq("id", listingId).single();
  expect(listing.data?.status).toBe("removed");
  const audit = await admin.from("moderation_audit_logs").select("id,actor_id,action,target_type,target_id,metadata,created_at").eq("target_id", listingId).single();
  expect(audit.data).toMatchObject({ actor_id: adminUser.id, action: "listing_removed", target_type: "listing", target_id: listingId, metadata: { report_id: reportId } });
  expect(Date.parse(audit.data!.created_at)).toBeGreaterThan(stamp);

  const hiddenAudit = await reporterClient.from("moderation_audit_logs").select("id").eq("id", audit.data!.id);
  expect(hiddenAudit.error || hiddenAudit.data.length === 0).toBeTruthy();
  const mutateAudit = await reporterClient.from("moderation_audit_logs").update({ action: "report_dismissed" }).eq("id", audit.data!.id);
  expect(mutateAudit.error).toBeTruthy();
  await reporterClient.auth.signOut();
});
