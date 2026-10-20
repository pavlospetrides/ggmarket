import type { Review } from "./types";

export function calculateRatingSummary(ratings: Array<number | string>) {
  const values = ratings.map(Number).filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  return {
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0,
    count: values.length,
  };
}

export function replaceReviewerRating(reviews: Review[], next: Review & { reviewerId?: string }) {
  const withoutPrevious = next.reviewerId
    ? reviews.filter((review) => review.reviewerId !== next.reviewerId)
    : reviews.filter((review) => review.id !== next.id);
  return [next, ...withoutPrevious];
}
