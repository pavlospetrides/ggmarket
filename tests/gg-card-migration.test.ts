import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readMigration = () => readFileSync("supabase/migrations/202610300001_my_gg_card.sql", "utf8");

describe("My GG Card migration security contract", () => {
  it("constrains stored presentation data and enables RLS", () => {
    const sql = readMigration();
    expect(sql).toMatch(/create table public\.gg_cards/i);
    expect(sql).toMatch(/user_id uuid primary key references public\.profiles\(id\) on delete cascade/i);
    expect(sql).toMatch(/char_length\(slogan\) between 1 and 80/i);
    expect(sql).toContain("theme_id in ('gg-purple', 'midnight-black', 'arctic-white', 'crimson')");
    expect(sql).toMatch(/alter table public\.gg_cards enable row level security/i);
  });

  it("keeps visitor reads explicit and owner writes active-user-only", () => {
    const sql = readMigration();
    expect(sql).toMatch(/for select[\s\S]+is_public = true[\s\S]+select 1 from public\.profiles[\s\S]+profiles\.id = gg_cards\.user_id/i);
    expect(sql).toMatch(/for select[\s\S]+auth\.uid\(\) = user_id/i);
    expect(sql).toMatch(/for insert[\s\S]+auth\.uid\(\) = user_id[\s\S]+public\.is_active_user\(\)/i);
    expect(sql).toMatch(/for update[\s\S]+using[\s\S]+auth\.uid\(\) = user_id[\s\S]+with check[\s\S]+public\.is_active_user\(\)/i);
    expect(sql).not.toMatch(/for delete/i);
  });

  it("applies suspension and timestamp enforcement without broad grants", () => {
    const sql = readMigration();
    expect(sql).toMatch(/execute function public\.reject_suspended_actor\(\)/i);
    expect(sql).toMatch(/execute function public\.touch_updated_at\(\)/i);
    expect(sql).toMatch(/protect_gg_card_owner[\s\S]+new\.user_id is distinct from old\.user_id/i);
    expect(sql).toMatch(/grant select \(user_id, slogan, theme_id, is_public\) on public\.gg_cards to anon, authenticated/i);
    expect(sql).toMatch(/grant insert \(user_id, slogan, theme_id, is_public\), update \(user_id, slogan, theme_id, is_public\) on public\.gg_cards to authenticated/i);
    expect(sql).not.toMatch(/grant all/i);
    expect(sql).not.toMatch(/storage\.(?:objects|buckets)/i);
    expect(sql).not.toMatch(/create\s+policy[\s\S]+on\s+storage\./i);
  });
});
