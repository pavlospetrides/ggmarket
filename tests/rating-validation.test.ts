import { describe, expect, it } from "vitest";
import { ratingSchema } from "../lib/validation";

const sellerId = "11111111-1111-4111-8111-111111111111";

describe("rating validation", () => {
  it("accepts one to five stars and normalizes optional review text", () => {
    expect(ratingSchema.parse({ sellerId, rating: 1, comment: "  Helpful seller  " })).toEqual({ sellerId, rating: 1, comment: "Helpful seller" });
    expect(ratingSchema.parse({ sellerId, rating: 5, comment: "   " })).toEqual({ sellerId, rating: 5, comment: null });
  });

  it("rejects out-of-range, fractional, oversized, and identity-forging input", () => {
    for (const rating of [0, 6, 2.5]) expect(ratingSchema.safeParse({ sellerId, rating }).success).toBe(false);
    expect(ratingSchema.safeParse({ sellerId, rating: 5, comment: "x".repeat(2001) }).success).toBe(false);
    expect(ratingSchema.safeParse({ sellerId, rating: 5, reviewerId: "22222222-2222-4222-8222-222222222222" }).success).toBe(false);
  });
});
