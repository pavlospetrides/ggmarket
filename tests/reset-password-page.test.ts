import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getClaims: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));

describe("reset password page", () => {
  beforeEach(() => {
    mocks.getClaims.mockReset();
    mocks.createClient.mockReset();
    mocks.createClient.mockResolvedValue({ auth: { getClaims: mocks.getClaims } });
  });

  it("shows the requested new-password screen for a recovery session", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "recovery", timestamp: 1 }] } }, error: null });
    const { default: ResetPasswordPage } = await import("../app/reset-password/page");
    const page = await ResetPasswordPage({ searchParams: Promise.resolve({}) });

    expect(page.props.title).toBe("Create new password");
  });

  it("does not unlock the form for an ordinary signed-in session", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { amr: [{ method: "password", timestamp: 1 }] } }, error: null });
    const { default: ResetPasswordPage } = await import("../app/reset-password/page");
    const page = await ResetPasswordPage({ searchParams: Promise.resolve({}) });

    expect(page.props.title).toBe("Reset link unavailable");
  });

  it("renders expired and success states without consulting a stale session", async () => {
    const { default: ResetPasswordPage } = await import("../app/reset-password/page");
    const expired = await ResetPasswordPage({ searchParams: Promise.resolve({ status: "expired_or_used" }) });
    const success = await ResetPasswordPage({ searchParams: Promise.resolve({ status: "success" }) });

    expect(expired.props.title).toBe("Reset link unavailable");
    expect(success.props.title).toBe("Password updated");
    expect(mocks.getClaims).not.toHaveBeenCalled();
  });

  it("restores a safe no-JavaScript validation message inside a recovery session", async () => {
    mocks.getClaims.mockResolvedValue({ data: { claims: { amr: ["recovery"] } }, error: null });
    const { default: ResetPasswordPage } = await import("../app/reset-password/page");
    const page = await ResetPasswordPage({ searchParams: Promise.resolve({ status: "validation", reason: "mismatch" }) });

    expect(page.props.title).toBe("Create new password");
    expect(page.props.children.props.initialError).toBe("Passwords do not match.");
    expect(page.props.children.props.initialErrorField).toBe("confirmation");
  });

  it("shows the invalid-link recovery UI when claims verification throws", async () => {
    mocks.getClaims.mockRejectedValue(new Error("network detail"));
    const { default: ResetPasswordPage } = await import("../app/reset-password/page");
    const page = await ResetPasswordPage({ searchParams: Promise.resolve({}) });

    expect(page.props.title).toBe("Reset link unavailable");
  });
});
