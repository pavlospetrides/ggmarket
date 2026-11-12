import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const path = "supabase/migrations/202611120003_profile_media.sql";

describe("profile media migration", () => {
  it("adds nullable cover metadata and public read grant without changing listing media", () => {
    const sql = readFileSync(path, "utf8");
    expect(sql).toMatch(/add column if not exists cover_path text/i);
    expect(sql).toMatch(/grant select \([^;]*cover_path[^;]*\)\s+on public\.profiles to anon, authenticated/is);
    expect(sql).not.toMatch(/alter table public\.listing_images/i);
  });

  it("requires reserved, owner scoped keys and snapshots replaced keys", () => {
    const sql = readFileSync(path, "utf8");
    expect(sql).toMatch(/create table public\.profile_media_reservations/i);
    expect(sql).toMatch(/new\.id\s*<>\s*auth\.uid\(\)/i);
    expect(sql).toMatch(/profile-media\/.*avatar.*cover/is);
    expect(sql).toMatch(/create table public\.profile_media_cleanup_jobs/i);
    expect(sql).toMatch(/old\.avatar_path is distinct from new\.avatar_path/i);
    expect(sql).toMatch(/old\.cover_path is distinct from new\.cover_path/i);
    const hardening = readFileSync("supabase/migrations/202610030005_production_security_hardening.sql", "utf8");
    expect(hardening).toContain("'profiles', 'listings'");
    expect(hardening).toContain("execute function public.reject_suspended_actor()");
  });

  it("limits upload claims and keeps privileged tables private", () => {
    const sql = readFileSync(path, "utf8");
    expect(sql).toMatch(/create function public\.claim_profile_media_upload\(\)/i);
    expect(sql).toMatch(/set search_path = ''/i);
    expect(sql).toMatch(/>= 10/i);
    expect(sql).toMatch(/revoke all on public\.profile_media_(reservations|cleanup_jobs|upload_claims)/i);
  });

  it("records media for later cleanup when an account is deleted", () => {
    const sql = readFileSync(path, "utf8");
    expect(sql).toMatch(/if tg_op = 'DELETE' then[\s\S]*old\.avatar_path[\s\S]*old\.cover_path/i);
    expect(sql).toMatch(/after update(?: of [\w, ]+)? or delete on public\.profiles/i);
  });
});
