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
  });

  it("enforces one pending application, one founder, and one referral reward", () => {
    expect(sql).toContain("seller_verifications_one_open_idx");
    expect(sql).toContain("founding_sellers_seller_key");
    expect(sql).toContain("promotion_reward_ledger_referral_key");
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
  });
});

