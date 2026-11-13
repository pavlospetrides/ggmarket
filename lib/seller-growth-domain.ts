export type SellerVerificationStatus =
  | "not_applied"
  | "pending"
  | "verified"
  | "more_info"
  | "rejected"
  | "revoked"
  | "expired";

export type SellerVerificationApplication = {
  id: string;
  seller_id: string;
  status: Exclude<SellerVerificationStatus, "not_applied">;
  application_note: string | null;
  decision_reason: string | null;
  reviewed_at: string | null;
  resubmission_eligible_at: string | null;
  created_at: string;
  updated_at: string;
};

export function canSubmitSellerVerification(application: SellerVerificationApplication | null, enabled: boolean, now = new Date()): boolean {
  if (!enabled) return false;
  if (!application || ["more_info", "revoked", "expired"].includes(application.status)) return true;
  if (application.status !== "rejected") return false;
  const eligibleAt = application.resubmission_eligible_at
    ? new Date(application.resubmission_eligible_at)
    : application.reviewed_at ? new Date(new Date(application.reviewed_at).getTime() + 7 * 24 * 60 * 60 * 1000) : null;
  return !eligibleAt || eligibleAt.getTime() <= now.getTime();
}

export function verificationEntryLabel(application: SellerVerificationApplication | null): string {
  switch (application?.status) {
    case "pending": return "Application Under Review";
    case "verified": return "Verified Seller";
    case "more_info": return "Provide More Information";
    case "rejected":
    case "revoked":
    case "expired": return "Reapply for Free Verification";
    default: return "Apply for Free Verification";
  }
}

export function verificationStatusContent(status: SellerVerificationStatus) {
  switch (status) {
    case "pending":
      return { label: "Application Under Review", nextStep: "GGMarket staff will review your marketplace profile and activity. You will receive an in-app notification." };
    case "more_info":
      return { label: "More information needed", nextStep: "Review the request, add the requested information, and submit again." };
    case "verified":
      return { label: "Verified Seller", nextStep: "Keep your account in good standing and your listings accurate. This badge reflects a manual seller review, not an identity check." };
    case "rejected":
      return { label: "Not approved", nextStep: "Review the reason below. You can apply again on the displayed eligible date." };
    case "revoked":
      return { label: "Verification Revoked", nextStep: "The badge has been removed. You may reapply under the existing application policy, or contact GGMarket support about the decision." };
    case "expired":
      return { label: "Review expired", nextStep: "Submit a new application if the seller-review program is available." };
    default:
      return { label: "Not Verified", nextStep: "Tell GGMarket how you source and describe the gaming items you list." };
  }
}

