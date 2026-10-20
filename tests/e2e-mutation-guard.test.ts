import { describe, expect, it } from "vitest";
import { validateMutationEnvironment } from "./e2e/mutation-guard";

const complete = {
  E2E_ALLOW_MUTATION: "1",
  E2E_EXPECTED_PROJECT_REF: "disposable-ref",
  NEXT_PUBLIC_SUPABASE_URL: "https://disposable-ref.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-placeholder",
  SUPABASE_SERVICE_ROLE_KEY: "service-placeholder",
};

describe("state-changing E2E preflight", () => {
  it("refuses mutation unless the explicit flag is enabled", () => {
    expect(() => validateMutationEnvironment({ ...complete, E2E_ALLOW_MUTATION: undefined }))
      .toThrow("State-changing E2E is disabled");
  });

  it("refuses a configured project that does not match the expected disposable ref", () => {
    expect(() => validateMutationEnvironment({ ...complete, NEXT_PUBLIC_SUPABASE_URL: "https://protected-ref.supabase.co" }))
      .toThrow("project-ref verification failed");
  });

  it("returns credentials only after both checks pass", () => {
    expect(validateMutationEnvironment(complete)).toEqual({
      url: complete.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: complete.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceKey: complete.SUPABASE_SERVICE_ROLE_KEY,
    });
  });
});
