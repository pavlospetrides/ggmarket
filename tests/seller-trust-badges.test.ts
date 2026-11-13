import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SellerTrustBadges } from "../components/seller-trust-badges";
import { verificationStatusContent } from "../lib/seller-growth";

describe("seller trust presentation", () => {
  it("describes a manual seller review without claiming identity or transaction safety", () => {
    const html = renderToStaticMarkup(createElement(SellerTrustBadges, { verified: true, founding: false }));
    expect(html).toContain("Seller reviewed");
    expect(html).toContain("Lootriva manually reviewed this seller&#x27;s marketplace profile and activity");
    expect(html).toContain("does not guarantee transactions, item authenticity, or that the seller is risk-free");
    expect(html).not.toContain("Identity verified");
  });

  it("keeps founder recognition distinct from seller review", () => {
    const html = renderToStaticMarkup(createElement(SellerTrustBadges, { verified: true, founding: true }));
    expect(html).toContain("Seller reviewed");
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

