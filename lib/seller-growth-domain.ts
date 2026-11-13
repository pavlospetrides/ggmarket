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

export function verificationStatusContent(status: SellerVerificationStatus) {
  switch (status) {
    case "pending":
      return { label: "Pending review", nextStep: "Lootriva staff will review your marketplace profile and activity. You will receive an in-app notification." };
    case "more_info":
      return { label: "More information needed", nextStep: "Review the request, add the requested information, and submit again." };
    case "verified":
      return { label: "Seller reviewed", nextStep: "Keep your account in good standing and your listings accurate." };
    case "rejected":
      return { label: "Not approved", nextStep: "Review the reason below. You can apply again on the displayed eligible date." };
    case "revoked":
      return { label: "Review revoked", nextStep: "Contact Lootriva support if you believe this decision needs another review." };
    case "expired":
      return { label: "Review expired", nextStep: "Submit a new application if the seller-review program is available." };
    default:
      return { label: "Not applied", nextStep: "Tell Lootriva how you source and describe the gaming items you list." };
  }
}

