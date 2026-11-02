import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Confirm Signup email template", () => {
  it("contains a clickable canonical HTTPS token-hash link for the SSR callback", async () => {
    const html = await readFile(new URL("../docs/auth/confirm-signup-email.html", import.meta.url), "utf8");

    expect(html).toMatch(/<a\s[^>]*href=/i);
    expect(html).toContain("https://ggmarket.eu/auth/callback?token_hash={{ .TokenHash }}");
    expect(html).toContain("&amp;type=email");
    expect(html).toContain("&amp;next=%2Fsettings%2Fverification");
    expect(html).toContain("&amp;welcome=1");
    expect(html).not.toContain("localhost");
  });
});
