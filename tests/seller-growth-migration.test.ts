import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/202611130002_seller_growth_program.sql"),
  "utf8",
).toLowerCase();

describe("seller growth migration security contract", () => {
  it("serializes and caps deterministic founding seller allocation", () => {
    expect(sql).toContain("pg_advisory_xact_lock");
    expect(sql).toContain("between 1 and 100");
    expect(sql).toMatch(/unique\s*\(slot_number\)/);
    expect(sql).toMatch(/order by\s+eligibility_met_at\s+asc,\s+seller_id\s+asc/);
  });

  it("makes verification audit and reward ledger entries immutable", () => {
    expect(sql).toContain("prevent_seller_growth_ledger_mutation");
    expect(sql).toContain("verification_audit_immutable");
    expect(sql).toContain("promotion_reward_ledger_immutable");
    expect(sql).toContain("seller_growth_admin_audit_immutable");
  });

  it("enforces one pending application, one founder, and one referral reward", () => {
    expect(sql).toContain("seller_verifications_one_open_idx");
    expect(sql).toContain("founding_sellers_seller_key");
    expect(sql).toContain("promotion_reward_ledger_referral_key");
    expect(sql).toContain("referred_id uuid not null unique");
    expect(sql).toContain("maximum five rewarded referrals");
  });

  it("attributes referrals only from a pre-signup opaque visit and qualifies them server-side", () => {
    expect(sql).toContain("create table public.referral_visits");
    expect(sql).toContain("function public.record_referral_visit(referral_code text)");
    expect(sql).toContain("function public.claim_referral_attribution(referral_visit uuid)");
    expect(sql).toMatch(/created < visit\.created_at/);
    expect(sql).toContain("email_confirmed_at is not null");
    expect(sql).toContain("interval '7 days'");
    expect(sql).toContain("create table public.referral_listing_eligibility");
    expect(sql).toContain("eligible_since <= now() - interval '7 days'");
    expect(sql).toContain("circular referral is not allowed");
    expect(sql).toMatch(/not public\.is_admin\(\)/);
  });

  it("lets a seller answer a more-information request without creating a duplicate application", () => {
    expect(sql).toContain("if latest.status = 'more_info' then");
    expect(sql).toMatch(/update public\.seller_verifications set[\s\S]+status = 'pending'[\s\S]+where id = latest\.id/);
  });

  it("starts founder benefits once, expires by server time, and accepts only owned active listings", () => {
    expect(sql).toContain("select seller_id, 'founder', id, 30 from inserted");
    expect(sql).toContain("featured_listing_campaigns_one_active_seller_idx");
    expect(sql).toContain("seller_id = actor and status = 'active'");
    expect(sql).toContain("campaign_end <= now()");
    expect(sql).toContain("campaign_start + make_interval(days => entitlement.duration_days)");
    expect(sql).toContain("function public.expire_featured_campaigns");
    expect(sql).toContain("pause_ineligible_featured_campaigns");
  });

  it("uses narrow security-definer functions with protected search paths", () => {
    for (const name of [
      "submit_seller_verification",
      "review_seller_verification",
      "allocate_founding_sellers",
      "activate_featured_listing",
      "claim_referral_attribution",
      "qualify_referrals",
      "redeem_referral_reward",
    ]) {
      expect(sql).toMatch(
        new RegExp(`function\\s+public\\.${name}[^$]+security definer[^$]+set search_path = ''`, "s"),
      );
    }
  });

  it("enables RLS without exposing private verification or referral records", () => {
    for (const table of [
      "seller_verification_audit",
      "founding_sellers",
      "promotion_entitlements",
      "featured_listing_campaigns",
      "referral_codes",
      "referrals",
      "promotion_reward_ledger",
    ]) {
      expect(sql).toContain(`alter table public.${table} enable row level security`);
    }
    expect(sql).not.toMatch(/grant\s+(insert|update|delete)\s+on\s+public\.seller_verification_audit\s+to\s+authenticated/);
    expect(sql).toContain('drop policy if exists "verifications own or admin read"');
    expect(sql).toContain('create policy "verifications admin read"');
    expect(sql).toContain('create policy "verification audit admin read"');
    expect(sql).toContain("function public.get_my_seller_verification()");
    expect(sql).toContain("create view public.seller_trust_signals");
    expect(sql).toContain("grant select on public.seller_trust_signals, public.active_featured_listings to anon, authenticated");
  });
});

