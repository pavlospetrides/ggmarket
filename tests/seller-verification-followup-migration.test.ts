import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const sql = readFileSync(new URL("../supabase/migrations/202611130005_seller_verification_entry_safety.sql", import.meta.url), "utf8").toLowerCase();

describe("seller verification follow-up migration", () => {
  it("blocks a new application from a currently verified seller at the database boundary", () => {
    expect(sql).toMatch(/latest\.status\s*=\s*'verified'/);
    expect(sql).toContain("application already approved");
    expect(sql).toContain("seller_id = actor");
    expect(sql).toContain("status = 'pending'");
  });

  it("prevents an administrator from deciding their own application", () => {
    expect(sql).toContain("create or replace function public.review_seller_verification(");
    expect(sql).toMatch(/current_app\.seller_id\s*=\s*actor/);
    expect(sql).toContain("cannot review own application");
  });

  it("shows a public badge only when the latest application is approved", () => {
    expect(sql).toContain("create or replace view public.seller_trust_signals");
    expect(sql).toContain("distinct on (seller_id)");
    expect(sql).toContain("where latest.status = 'verified'");
  });

  it("does not introduce tables, broader grants, or policy changes", () => {
    expect(sql).not.toMatch(/create\s+table|grant\s+|alter\s+table|create\s+policy|drop\s+policy/);
    expect(sql).toContain("security definer set search_path = ''");
    expect(sql).toContain("public.is_active_user()");
  });

  it("executes against the existing schema shape and removes the badge after revocation", async () => {
    const db = new PGlite();
    try {
      await db.exec(`
        create schema auth;
        create function auth.uid() returns uuid language sql stable as $$ select '11111111-1111-4111-8111-111111111111'::uuid $$;
        create function public.is_active_user() returns boolean language sql stable as $$ select true $$;
        create function public.is_admin() returns boolean language sql stable as $$ select true $$;
        create function public.seller_growth_feature_enabled(text) returns boolean language sql stable as $$ select true $$;
        create table public.seller_verifications (
          id uuid primary key default gen_random_uuid(), seller_id uuid not null, status text not null,
          application_note text, decision_reason text, reviewer_note text, reviewed_by uuid,
          reviewed_at timestamptz, eligibility_reviewed_at timestamptz, resubmission_eligible_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
        );
        create table public.seller_verification_audit (
          application_id uuid, seller_id uuid, actor_id uuid, action text, previous_status text, next_status text, reason text, reviewer_note text
        );
        create table public.notifications (user_id uuid, type text, title text, body text, href text, entity_id uuid, dedupe_key text, unique(user_id,dedupe_key));
        create table public.founding_sellers (seller_id uuid, badge_active boolean, revoked_at timestamptz);
        insert into public.seller_verifications(id,seller_id,status,application_note,created_at)
        values ('22222222-2222-4222-8222-222222222222','11111111-1111-4111-8111-111111111111','verified','A previously approved seller statement.','2026-11-01');
      `);
      await db.exec(sql);
      await expect(db.query("select public.review_seller_verification('22222222-2222-4222-8222-222222222222','revoke','Own application','')"))
        .rejects.toThrow(/cannot review own application/);
      await expect(db.query("select public.submit_seller_verification('I describe my gaming listings accurately.')"))
        .rejects.toThrow(/application already approved/);
      const approved = await db.query<{ seller_reviewed: boolean }>("select seller_reviewed from public.seller_trust_signals where seller_id = '11111111-1111-4111-8111-111111111111'");
      expect(approved.rows[0]?.seller_reviewed).toBe(true);
      await db.exec("create or replace function auth.uid() returns uuid language sql stable as $$ select 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid $$");
      await db.query("select public.review_seller_verification('22222222-2222-4222-8222-222222222222','revoke','Listing activity changed','')");
      const revoked = await db.query("select seller_id from public.seller_trust_signals where seller_id = '11111111-1111-4111-8111-111111111111'");
      expect(revoked.rows).toHaveLength(0);
      await db.exec("insert into public.seller_verifications(id,seller_id,status,application_note,created_at) values ('44444444-4444-4444-8444-444444444444','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','pending','Another truthful seller statement.','2026-11-12'),('55555555-5555-4555-8555-555555555555','cccccccc-cccc-4ccc-8ccc-cccccccccccc','pending','A third seller statement for review.','2026-11-12')");
      await db.query("select public.review_seller_verification('44444444-4444-4444-8444-444444444444','approve',null,null)");
      await db.query("select public.review_seller_verification('55555555-5555-4555-8555-555555555555','reject','Listing details need improvement',null)");
      const decisions = await db.query<{ seller_id: string; seller_reviewed: boolean }>("select seller_id,seller_reviewed from public.seller_trust_signals where seller_id in ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','cccccccc-cccc-4ccc-8ccc-cccccccccccc')");
      expect(decisions.rows).toEqual([{ seller_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", seller_reviewed: true }]);
      await db.exec("create or replace function auth.uid() returns uuid language sql stable as $$ select '11111111-1111-4111-8111-111111111111'::uuid $$");
      await db.exec("insert into public.seller_verifications(id,seller_id,status,application_note,created_at) values ('33333333-3333-4333-8333-333333333333','99999999-9999-4999-8999-999999999999','verified','Another seller private statement.','2026-11-12')");
      const own = await db.query<{ seller_id: string; status: string }>("select seller_id,status from public.get_my_seller_verification()");
      expect(own.rows).toEqual([{ seller_id: "11111111-1111-4111-8111-111111111111", status: "revoked" }]);
      await db.query("select public.submit_seller_verification('I describe my gaming listings accurately.')");
      const reapplied = await db.query<{ status: string }>("select status from public.seller_verifications where seller_id = '11111111-1111-4111-8111-111111111111' order by created_at desc, id desc limit 1");
      expect(reapplied.rows[0]?.status).toBe("pending");
      await expect(db.query("select public.submit_seller_verification('I describe my gaming listings accurately.')"))
        .rejects.toThrow(/application already pending/);
      const notApproved = await db.query("select seller_id from public.seller_trust_signals where seller_id = '11111111-1111-4111-8111-111111111111'");
      expect(notApproved.rows).toHaveLength(0);
    } finally {
      await db.close();
    }
  }, 30000);
});
