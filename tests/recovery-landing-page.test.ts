import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cookieValue: "" }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => mocks.cookieValue ? { value: mocks.cookieValue } : undefined,
  }),
}));

describe("recovery confirmation landing page", () => {
  beforeEach(() => {
    mocks.cookieValue = "";
  });

  it("requires an explicit POST without rendering the recovery token", async () => {
    mocks.cookieValue = "a".repeat(64);
    const { default: ContinuePasswordRecoveryPage } = await import("../app/auth/recovery/continue/page");
    const html = renderToStaticMarkup(await ContinuePasswordRecoveryPage());

    expect(html).toContain("Continue password reset");
    expect(html).toContain('action="/auth/recovery/confirm"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Continue to create new password");
    expect(html).not.toContain(mocks.cookieValue);
  });

  it("does not offer confirmation without a pending recovery cookie", async () => {
    const { default: ContinuePasswordRecoveryPage } = await import("../app/auth/recovery/continue/page");
    const html = renderToStaticMarkup(await ContinuePasswordRecoveryPage());

    expect(html).toContain("Reset link unavailable");
    expect(html).toContain("Request new reset link");
    expect(html).not.toContain('action="/auth/recovery/confirm"');
  });
});
