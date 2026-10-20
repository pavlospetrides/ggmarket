import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("essential storage disclosure", () => {
  it("publishes cookie and privacy routes from a site-wide footer", () => {
    const layout = read("app/layout.tsx");
    const footer = read("components/site-footer.tsx");
    expect(layout).toContain("<SiteFooter />");
    expect(footer).toContain('href="/cookies"');
    expect(footer).toContain('href="/privacy"');
  });

  it("documents the verified cookie and browser-storage inventory", () => {
    const policy = read("app/cookies/page.tsx");
    expect(policy).toContain("sb-&lt;project-ref&gt;-auth-token");
    expect(policy).toContain("400 days");
    expect(policy).toContain("ggmarket-sw-recovery");
    expect(policy).toContain("ggmarket-shell-v3");
    expect(policy).toContain("no analytics, advertising, or marketing cookies");
    expect(policy).toContain("does not ask for cookie consent");
  });

  it("marks unresolved controller and retention facts for owner review", () => {
    const privacy = read("app/privacy/page.tsx");
    expect(privacy).toContain("Owner review required");
    expect(privacy).toContain("legal identity");
    expect(privacy).toContain("retention schedule");
    expect(privacy).toContain("Supabase");
  });
});
