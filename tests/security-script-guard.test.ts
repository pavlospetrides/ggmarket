import { describe, expect, it } from "vitest";
import { validateMutationEnvironment } from "../scripts/mutation-environment.mjs";
import { validateMutationEnvironment as validateE2eMutationEnvironment } from "./e2e/mutation-guard";

const local = {
  E2E_ALLOW_MUTATION: "1",
  E2E_EXPECTED_PROJECT_REF: "local",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
};

describe("destructive security-script preflight", () => {
  it("refuses execution without the explicit mutation flag", () => {
    expect(() => validateMutationEnvironment({ ...local, E2E_ALLOW_MUTATION: undefined }, { requireLocal: true }))
      .toThrow("State-changing security testing is disabled");
  });

  it("refuses a remote Supabase project even when its reference matches", () => {
    expect(() => validateMutationEnvironment({
      ...local,
      E2E_EXPECTED_PROJECT_REF: "protected-ref",
      NEXT_PUBLIC_SUPABASE_URL: "https://protected-ref.supabase.co",
    }, { requireLocal: true })).toThrow("requires a local Supabase URL");
  });

  it("returns credentials only for the explicitly authorized local target", () => {
    expect(validateMutationEnvironment(local, { requireLocal: true })).toEqual({
      url: local.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: local.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: local.SUPABASE_SERVICE_ROLE_KEY,
    });
  });
});

describe("state-changing browser preflight", () => {
  it("accepts only the explicitly authorized loopback target as local", () => {
    expect(validateE2eMutationEnvironment(local)).toEqual({
      url: local.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: local.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: local.SUPABASE_SERVICE_ROLE_KEY,
    });
    expect(() => validateE2eMutationEnvironment({
      ...local,
      NEXT_PUBLIC_SUPABASE_URL: "https://local.supabase.co",
    })).toThrow("loopback");
  });
});
