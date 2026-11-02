import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/202611030001_private_voice_messages.sql"), "utf8");

describe("private voice message migration", () => {
  it("keeps the audio bucket private and limits supported media", () => {
    expect(sql).toMatch(/'message-audio'.*false.*15728640/s);
    expect(sql).toContain("array['audio/webm', 'audio/ogg', 'audio/mp4']");
  });

  it("requires conversation membership for reads and inserts", () => {
    expect(sql).toMatch(/message audio participant read[\s\S]*conversation_members[\s\S]*cm\.user_id = auth\.uid\(\)/i);
    expect(sql).toMatch(/message audio member insert[\s\S]*foldername\(name\)\)\[2\] = auth\.uid\(\)::text/i);
    expect(sql).not.toMatch(/message-audio'[\s\S]*for select[\s\S]*using\s*\(\s*true\s*\)/i);
  });
});
