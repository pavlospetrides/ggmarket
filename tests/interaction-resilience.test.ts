import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("interactive request resilience", () => {
  it("keeps listing create and edit controls inert until their handlers are attached", () => {
    for (const path of ["components/sell-wizard.tsx", "components/manage-listing-form.tsx"]) {
      const source = read(path);
      expect(source, path).toContain("useHydrated");
      expect(source, path).toContain("data-hydrated={hydrated}");
      expect(source, path).toMatch(/<fieldset[^>]+disabled=\{!hydrated \|\|/);
    }
  });

  it("restores the message seller control after network failures", () => {
    const source = read("components/message-seller-button.tsx");
    expect(source).toContain("try {");
    expect(source).toContain("catch");
    expect(source).toContain("finally");
    expect(source).toContain("setBusy(false)");
  });

  it("refreshes authenticated Server Component data after client login navigation", () => {
    const source = read("components/auth-form.tsx");
    expect(source).toMatch(/router\.replace\(next\);\s*router\.refresh\(\);/);
  });

  it("does not let listing cleanup failures strand the publish control", () => {
    const source = read("components/sell-wizard.tsx");
    expect(source).toContain('fetch(`/api/listings/${listingId}`, { method: "DELETE" }).catch');
    expect(source).toMatch(/finally\s*\{\s*setPublishing\(false\)/);
  });

  it("restores destructive listing controls after request failures", () => {
    const source = read("components/manage-listing-form.tsx");
    expect(source).toMatch(/async function removeListing[\s\S]*?try \{/);
    expect(source).toMatch(/async function removeListing[\s\S]*?finally \{[\s\S]*?setBusy\(false\)/);
  });
});
