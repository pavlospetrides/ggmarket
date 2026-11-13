import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AdminSellerVerifications } from "../components/admin-seller-verifications";

describe("admin seller verification history", () => {
  it("shows immutable decision events with reviewer and timestamp", () => {
    const html = renderToStaticMarkup(createElement(AdminSellerVerifications, {
      enabled: true,
      applications: [{
        id: "application-a", seller_id: "seller-a", status: "rejected", application_note: "I accurately describe every gaming item that I list.", reviewer_note: "Profile activity did not match the statement.", decision_reason: "Please establish more marketplace history.", reviewed_at: "2026-11-13T10:00:00Z", resubmission_eligible_at: "2026-11-20T10:00:00Z", created_at: "2026-11-12T10:00:00Z", updated_at: "2026-11-13T10:00:00Z",
        seller: { username: "seller", display_name: "Seller" }, reviewer: { username: "reviewer", display_name: "Reviewer One" },
        audit: [{ id: "event-a", action: "rejected", previous_status: "pending", next_status: "rejected", reason: "Please establish more marketplace history.", reviewer_note: "Profile activity did not match the statement.", created_at: "2026-11-13T10:00:00Z", actor: { display_name: "Reviewer One", username: "reviewer" } }],
      }],
    }));
    expect(html).toContain("Decision history");
    expect(html).toContain("Reviewer One");
    expect(html).toContain("pending → rejected");
    expect(html).toContain("Please establish more marketplace history.");
  });
});
