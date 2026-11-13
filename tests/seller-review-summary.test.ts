import { describe, expect, it, vi } from "vitest";
import { readSellerReviewSummary } from "../lib/seller-review-summary";

const seller = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("seller review summary read", () => {
  it("uses the database aggregate for the requested seller", async () => {
    const rpc = vi.fn(() => ({ single: async () => ({ data: { average: 4.5, review_count: 2 }, error: null }) }));
    await expect(readSellerReviewSummary({ rpc } as never, seller)).resolves.toEqual({ average: 4.5, count: 2 });
    expect(rpc).toHaveBeenCalledWith("seller_review_summary", { target_seller: seller });
  });
  it("rejects missing or malformed aggregate results", async () => {
    const rpc = vi.fn(() => ({ single: async () => ({ data: { average: Number.NaN, review_count: 2 }, error: null }) }));
    await expect(readSellerReviewSummary({ rpc } as never, seller)).rejects.toThrow();
  });
});
