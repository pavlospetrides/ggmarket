import { BadgeCheck, Medal } from "lucide-react";

const reviewExplanation = "GGMarket staff reviewed this seller's marketplace profile, listing quality, and account activity. No government ID or identity check is part of this review. This does not guarantee transactions or item authenticity.";
const founderExplanation = "This account was one of the first 100 eligible sellers approved by Lootriva. Founder recognition is separate from seller review and ratings.";

export function SellerTrustBadges({
  verified,
  founding,
  compact = false,
}: {
  verified: boolean;
  founding?: boolean;
  compact?: boolean;
}) {
  if (!verified && !founding) return null;
  return (
    <span className={`inline-flex min-w-0 flex-wrap items-center ${compact ? "gap-1" : "gap-2"}`}>
      {verified ? (
        <span
          className={compact ? "inline-flex items-center text-[var(--success)]" : "badge border-[#28563e] bg-[#123021] text-[#75e5aa]"}
          aria-label={`Verified Seller. ${reviewExplanation}`}
          title={reviewExplanation}
        >
          <BadgeCheck className={compact ? "size-4" : "size-4"} aria-hidden="true" />
          {compact ? <span className="sr-only">Verified Seller</span> : "Verified Seller"}
        </span>
      ) : null}
      {founding ? (
        <span
          className={compact ? "inline-flex items-center text-[#cbbcff]" : "badge border-[#59459a] bg-[#211a3d] text-[#d8ceff]"}
          aria-label={`Founding seller. ${founderExplanation}`}
          title={founderExplanation}
        >
          <Medal className="size-4" aria-hidden="true" />
          {compact ? <span className="sr-only">Founding seller</span> : "Founding seller"}
        </span>
      ) : null}
    </span>
  );
}

