export type SellerGrowthFeature =
  | "SELLER_VERIFICATION_ENABLED"
  | "FOUNDING_SELLERS_ENABLED"
  | "FEATURED_LISTINGS_ENABLED"
  | "REFERRAL_REWARDS_ENABLED";

type Environment = Record<string, string | undefined>;

const knownFeatures = new Set<SellerGrowthFeature>([
  "SELLER_VERIFICATION_ENABLED",
  "FOUNDING_SELLERS_ENABLED",
  "FEATURED_LISTINGS_ENABLED",
  "REFERRAL_REWARDS_ENABLED",
]);

export function isFeatureEnabled(
  name: SellerGrowthFeature,
  environment: Environment = process.env,
): boolean {
  if (!knownFeatures.has(name)) {
    throw new Error(`Unknown seller growth feature: ${String(name)}`);
  }
  return environment[name]?.trim().toLowerCase() === "true";
}

export function sellerGrowthFlags(environment: Environment = process.env) {
  return {
    sellerVerification: isFeatureEnabled("SELLER_VERIFICATION_ENABLED", environment),
    foundingSellers: isFeatureEnabled("FOUNDING_SELLERS_ENABLED", environment),
    featuredListings: isFeatureEnabled("FEATURED_LISTINGS_ENABLED", environment),
    referralRewards: isFeatureEnabled("REFERRAL_REWARDS_ENABLED", environment),
  } as const;
}

