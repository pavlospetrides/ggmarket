import { describe, expect, it } from "vitest";
import {
  hasRecoveryAuthenticationMethod,
  validateNewPassword,
} from "../lib/password-recovery";

describe("password recovery domain rules", () => {
  it("accepts only a recovery authentication method from verified JWT claims", () => {
    expect(hasRecoveryAuthenticationMethod([{ method: "recovery", timestamp: 1 }])).toBe(true);
    expect(hasRecoveryAuthenticationMethod(["token_refresh", "recovery"])).toBe(true);
    expect(hasRecoveryAuthenticationMethod([{ method: "password", timestamp: 1 }])).toBe(false);
    expect(hasRecoveryAuthenticationMethod([{ method: "oauth", timestamp: 1 }])).toBe(false);
    expect(hasRecoveryAuthenticationMethod("recovery")).toBe(false);
    expect(hasRecoveryAuthenticationMethod([{ method: 42 }])).toBe(false);
  });

  it("requires at least 8 password characters", () => {
    expect(validateNewPassword("short", "short")).toEqual({
      ok: false,
      field: "password",
      message: "Use at least 8 characters.",
    });
  });

  it("rejects password input above the application limit", () => {
    const password = "x".repeat(1025);
    expect(validateNewPassword(password, password)).toEqual({
      ok: false,
      field: "password",
      message: "Use no more than 1,024 characters.",
    });
  });

  it("focuses confirmation when the passwords differ", () => {
    expect(validateNewPassword("correct-horse", "different-value")).toEqual({
      ok: false,
      field: "confirmation",
      message: "Passwords do not match.",
    });
  });

  it("preserves a valid password exactly", () => {
    expect(validateNewPassword(" space-safe ", " space-safe ")).toEqual({
      ok: true,
      password: " space-safe ",
    });
  });
});
