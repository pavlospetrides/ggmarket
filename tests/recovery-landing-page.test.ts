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
    const { default: ContinuePasswordRecoveryPage, metadata } = await import("../app/auth/recovery/continue/page");
    const html = renderToStaticMarkup(await ContinuePasswordRecoveryPage());

    expect(html).toContain("Continue password reset");
    expect(html).toContain('action="/auth/recovery/confirm"');
    expect(html).toContain('method="post"');
    expect(html).toContain("Continue to create new password");
    expect(html).not.toContain(mocks.cookieValue);
    expect(metadata.referrer).toBe("same-origin");
  });

  it("does not depend on the redirect request exposing a newly staged cookie", async () => {
    const { default: ContinuePasswordRecoveryPage } = await import("../app/auth/recovery/continue/page");
    const html = renderToStaticMarkup(await ContinuePasswordRecoveryPage());

    expect(html).toContain("Continue password reset");
    expect(html).toContain('action="/auth/recovery/confirm"');
    expect(html).toContain("Continue to create new password");
  });
});
