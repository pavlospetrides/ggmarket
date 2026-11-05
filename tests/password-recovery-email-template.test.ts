import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Reset Password email template", () => {
  it("links the one-time token hash directly to the recovery verifier", async () => {
    const html = await readFile(new URL("../docs/auth/reset-password-email.html", import.meta.url), "utf8");

    expect(html).toMatch(/<a\s[^>]*href=/i);
    expect(html).toContain("https://ggmarket.eu/auth/recovery?token_hash={{ .TokenHash }}");
    expect(html).toContain("&amp;type=recovery");
    expect(html).not.toContain("{{ .ConfirmationURL }}");
    expect(html).not.toContain("{{ .RedirectTo }}");
    expect(html).not.toContain("localhost");
  });

  it("configures the disposable local stack for its HTTP recovery endpoint", async () => {
    const config = await readFile(new URL("../supabase/config.toml", import.meta.url), "utf8");
    const html = await readFile(new URL("../supabase/templates/recovery.html", import.meta.url), "utf8");

    expect(config).toContain('"http://localhost:3000/auth/recovery"');
    expect(config).toContain('[auth.email.template.recovery]');
    expect(config).toContain('content_path = "./supabase/templates/recovery.html"');
    expect(html).toContain("http://localhost:3000/auth/recovery?token_hash={{ .TokenHash }}");
    expect(html).toContain("&amp;type=recovery");
  });
});
