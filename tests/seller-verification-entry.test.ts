import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SellerVerificationEntry } from "../components/seller-verification-entry";
import { SellerVerificationPanel } from "../components/seller-verification-panel";
import { canSubmitSellerVerification, verificationEntryLabel, type SellerVerificationApplication } from "../lib/seller-growth-domain";

const application = (status: SellerVerificationApplication["status"], eligibleAt: string | null = null): SellerVerificationApplication => ({
  id: "application-id", seller_id: "seller-id", status, application_note: "I describe my listings accurately.",
  decision_reason: null, reviewed_at: null, resubmission_eligible_at: eligibleAt,
  created_at: "2026-11-13T10:00:00Z", updated_at: "2026-11-13T10:00:00Z",
});
const now = new Date("2026-11-13T12:00:00Z");

describe("seller verification entry", () => {
  it("offers a free application to an unverified seller and a valid reapplication after revocation", () => {
    expect(canSubmitSellerVerification(null, true, now)).toBe(true);
    expect(canSubmitSellerVerification(application("revoked"), true, now)).toBe(true);
    expect(verificationEntryLabel(null)).toBe("Apply for Free Verification");
    expect(verificationEntryLabel(application("revoked"))).toBe("Reapply for Free Verification");
  });

  it("blocks pending, approved, and rejected applications during cooldown", () => {
    expect(canSubmitSellerVerification(application("pending"), true, now)).toBe(false);
    expect(canSubmitSellerVerification(application("verified"), true, now)).toBe(false);
    expect(canSubmitSellerVerification(application("rejected", "2026-11-20T12:00:00Z"), true, now)).toBe(false);
    expect(canSubmitSellerVerification(application("rejected", "2026-11-12T12:00:00Z"), true, now)).toBe(true);
    expect(canSubmitSellerVerification(null, false, now)).toBe(false);
  });

  it("renders a prominent profile action without claiming approval before review", () => {
    const html = renderToStaticMarkup(createElement(SellerVerificationEntry, { application: null, enabled: true, compact: true }));
    expect(html).toContain("Apply for Free Verification");
    expect(html).toContain('href="/settings/seller-growth#seller-review-heading"');
    expect(html).not.toContain("Verified Seller");
  });

  it("shows pending and approved status without another application action", () => {
    const pending = renderToStaticMarkup(createElement(SellerVerificationEntry, { application: application("pending"), enabled: true }));
    const approved = renderToStaticMarkup(createElement(SellerVerificationEntry, { application: application("verified"), enabled: true }));
    expect(pending).toContain("Application Under Review");
    expect(pending).not.toContain("Apply for Free Verification");
    expect(approved).toContain("Verified Seller");
    expect(approved).not.toContain("Apply for Free Verification");
  });

  it("makes the application form follow the existing rejected cooldown and revoked policy", () => {
    const rejected = renderToStaticMarkup(createElement(SellerVerificationPanel, { initialApplication: application("rejected", "2999-11-20T12:00:00Z"), enabled: true }));
    const revoked = renderToStaticMarkup(createElement(SellerVerificationPanel, { initialApplication: application("revoked"), enabled: true }));
    expect(rejected).not.toContain("Submit free application");
    expect(revoked).toContain("Submit free application");
  });

  it("does not offer a reapplication link during the rejection cooldown", () => {
    const html = renderToStaticMarkup(createElement(SellerVerificationEntry, { application: application("rejected", "2999-11-20T12:00:00Z"), enabled: true }));
    expect(html).toContain("Reapplication opens after the review cooldown");
    expect(html).not.toContain('href="/settings/seller-growth#seller-review-heading"');
  });

  it("keeps the free application entry discoverable while the program is paused", () => {
    const html = renderToStaticMarkup(createElement(SellerVerificationEntry, { application: null, enabled: false }));
    expect(html).toContain("Apply for Free Verification");
    expect(html).toContain("Applications are currently paused");
  });

  it("keeps the form disabled until its submit handler has hydrated", () => {
    const html = renderToStaticMarkup(createElement(SellerVerificationPanel, { initialApplication: null, enabled: true }));
    expect(html).toContain('data-hydrated="false"');
    expect(html).toMatch(/<button[^>]+disabled=""[^>]*>.*Submit free application/);
  });
});
