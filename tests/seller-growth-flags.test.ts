import { describe, expect, it } from "vitest";
import { isFeatureEnabled, sellerGrowthFlags } from "@/lib/feature-flags";

describe("seller growth feature flags", () => {
  it("keeps every program disabled when configuration is absent", () => {
    expect(sellerGrowthFlags({})).toEqual({
      sellerVerification: false,
      foundingSellers: false,
      featuredListings: false,
      referralRewards: false,
    });
  });

  it("enables only an exact, case-insensitive true value", () => {
    const environment = {
      SELLER_VERIFICATION_ENABLED: "TRUE",
      FOUNDING_SELLERS_ENABLED: "1",
      FEATURED_LISTINGS_ENABLED: " true ",
      REFERRAL_REWARDS_ENABLED: "yes",
    };

    expect(sellerGrowthFlags(environment)).toEqual({
      sellerVerification: true,
      foundingSellers: false,
      featuredListings: true,
      referralRewards: false,
    });
  });

  it("rejects unknown flag names instead of silently enabling a feature", () => {
    expect(() => isFeatureEnabled("UNKNOWN" as never, {})).toThrow(
      "Unknown seller growth feature",
    );
  });
});

