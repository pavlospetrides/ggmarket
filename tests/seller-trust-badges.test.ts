import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SellerTrustBadges } from "../components/seller-trust-badges";
import { verificationStatusContent } from "../lib/seller-growth-domain";

describe("seller trust presentation", () => {
  it("describes a manual seller review without claiming identity or transaction safety", () => {
    const html = renderToStaticMarkup(createElement(SellerTrustBadges, { verified: true, founding: false }));
    expect(html).toContain("Verified Seller");
    expect(html).toContain("GGMarket staff reviewed this seller&#x27;s marketplace profile, listing quality, and account activity");
    expect(html).toContain("No government ID or identity check is part of this review");
    expect(html).toContain("does not guarantee transactions or item authenticity");
    expect(html).not.toContain("Identity verified");
  });

  it("keeps founder recognition distinct from seller review", () => {
    const html = renderToStaticMarkup(createElement(SellerTrustBadges, { verified: true, founding: true }));
    expect(html).toContain("Verified Seller");
    expect(html).toContain("Founding seller");
    expect(html).toContain("one of the first 100 eligible sellers");
  });

  it("gives pending, more-information, rejected, and revoked states a next step", () => {
    expect(verificationStatusContent("pending").nextStep).toContain("review");
    expect(verificationStatusContent("more_info").nextStep).toContain("requested information");
    expect(verificationStatusContent("rejected").nextStep).toContain("eligible date");
    expect(verificationStatusContent("revoked").nextStep).toContain("support");
  });
});

