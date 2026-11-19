import { afterEach, describe, expect, it, vi } from "vitest";
import { DataAccessError } from "@/lib/data";

vi.mock("server-only", () => ({}));

afterEach(() => vi.restoreAllMocks());

describe("database error diagnostics", () => {
  it("retains the database code without logging private error details", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const failure = new DataAccessError("load categories", {
      code: "42501",
      message: "permission denied; token=private-value",
      details: "private-value",
    });

    expect(failure.message).toBe("Unable to load categories.");
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[0]).toBe(JSON.stringify({
      event: "lootriva_data_error",
      operation: "load categories",
      code: "42501",
    }));
  });
});
