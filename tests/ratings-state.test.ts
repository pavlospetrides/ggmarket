import { describe, expect, it } from "vitest";
import { calculateRatingSummary, replaceReviewerRating } from "../lib/ratings";

describe("rating summaries", () => {
  it("calculates an accurate average and count", () => {
    expect(calculateRatingSummary([5, 4, "3"])).toEqual({ average: 4, count: 3 });
  });

  it("does not inflate the visible list when a reviewer updates a rating", () => {
    const previous = [
      { id: "old", reviewerId: "account-a", rating: 2, createdAt: "2026-01-01", reviewerName: "A" },
      { id: "other", reviewerId: "account-b", rating: 5, createdAt: "2026-01-02", reviewerName: "B" },
    ];
    const next = { id: "old", reviewerId: "account-a", rating: 4, createdAt: "2026-01-03", reviewerName: "A" };
    expect(replaceReviewerRating(previous, next)).toEqual([next, previous[1]]);
  });

  it("does not carry Account A's review into Account B's identity", () => {
    const previous = [{ id: "a", reviewerId: "account-a", rating: 5, createdAt: "2026-01-01", reviewerName: "A" }];
    const next = { id: "b", reviewerId: "account-b", rating: 1, createdAt: "2026-01-02", reviewerName: "B" };
    expect(replaceReviewerRating(previous, next).map((review) => review.reviewerId)).toEqual(["account-b", "account-a"]);
  });
});
