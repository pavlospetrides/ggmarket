import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("listing image signing", () => {
  it("signs a listing page in one storage request", () => {
    const source = readFileSync("lib/data.ts", "utf8");

    expect(source).toContain(".createSignedUrls(imagePaths, 3600)");
    expect(source).not.toContain("imagePaths.map(async (path)");
  });
});

describe("public-page client work", () => {
  it("loads the Supabase browser client only after an authenticated notification bootstrap", () => {
    const source = readFileSync("components/notification-center.tsx", "utf8");

    expect(source).toContain('await import("@/lib/supabase/client")');
    expect(source).not.toContain('import { createClient } from "@/lib/supabase/client"');
  });
});
