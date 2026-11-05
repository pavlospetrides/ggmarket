import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

describe("signup confirmation landing", () => {
  it("renders an explicit POST without reflecting the token", async () => {
    const { default: SignupConfirmationPage, metadata } = await import("../app/auth/confirm-signup/continue/page");
    const html = renderToStaticMarkup(SignupConfirmationPage());
    expect(html).toContain("Confirm your email");
    expect(html).toContain('action="/auth/confirm-signup/verify"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Verify email and continue");
    expect(html).not.toContain("token_hash");
    expect(metadata.referrer).toBe("same-origin");
  });
});
