import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Confirm Signup email template", () => {
  it("contains a clickable canonical token-hash link for explicit signup confirmation", async () => {
    const html = await readFile(new URL("../docs/auth/confirm-signup-email.html", import.meta.url), "utf8");

    expect(html).toMatch(/<a\s[^>]*href=/i);
    expect(html).toContain("https://ggmarket.eu/auth/confirm-signup?token_hash={{ .TokenHash }}");
    expect(html).toContain("&amp;type=email");
    expect(html).not.toContain("ConfirmationURL");
    expect(html).not.toContain("RedirectTo");
    expect(html).not.toContain("localhost");
  });

  it("keeps the disposable local Supabase template aligned", async () => {
    const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
    const html = await readFile(new URL("../supabase/templates/confirmation.html", import.meta.url), "utf8");
    expect(config).toContain('"http://localhost:3000/auth/confirm-signup"');
    expect(config).toMatch(/\[auth\.email\][\s\S]*?enable_confirmations = true/);
    expect(config).toContain("[auth.email.template.confirmation]");
    expect(html).toContain("http://localhost:3000/auth/confirm-signup?token_hash={{ .TokenHash }}");
    expect(html).toContain("&amp;type=email");
  });
});
