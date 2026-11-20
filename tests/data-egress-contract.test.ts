import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import * as dataAccess from "@/lib/data";

function projection(name: "listingCardSelect" | "listingDetailSelect") {
  return (dataAccess as unknown as Record<string, unknown>)[name];
}

describe("listing database egress projections", () => {
  it("keeps card-visible fields but omits detail-only payload", () => {
    const value = projection("listingCardSelect");

    expect(value).toEqual(expect.any(String));
    expect(value).toContain("attributes");
    expect(value).toContain("card_path");
    expect(value).toContain("display_name");
    expect(value).not.toMatch(/(^|,)description(,|$)/);
    expect(value).not.toContain("detail_path");
    expect(value).not.toContain("location,bio,created_at)");
  });

  it("keeps the complete fields required by listing details", () => {
    const value = projection("listingDetailSelect");

    expect(value).toEqual(expect.any(String));
    expect(value).toMatch(/(^|,)description(,|$)/);
    expect(value).toContain("detail_path");
    expect(value).toContain("location,bio,created_at)");
  });
});
