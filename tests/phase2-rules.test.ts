import { describe, expect, it } from "vitest";
import {
  canRespondToOffer,
  savedSearchMatches,
  validTradeProposal,
} from "../lib/phase2";
import {
  messageSchema,
  offerSchema,
  savedSearchSchema,
  savedSearchUpdateSchema,
  tradeSchema,
} from "../lib/validation";

const buyer = "00000000-0000-4000-8000-000000000001";
const seller = "00000000-0000-4000-8000-000000000002";
const conversation = "00000000-0000-4000-8000-000000000003";

describe("Phase 2 marketplace rules", () => {
  it("matches every configured saved-search constraint", () => {
    const listing = {
      title: "NVIDIA RTX 4070 Super",
      price: 480,
      categoryId: "gpu",
      condition: "excellent",
      intent: "sale" as const,
      location: "Limassol",
    };
    expect(
      savedSearchMatches(
        {
          searchTerm: "4070",
          maxPrice: 500,
          categoryId: "gpu",
          location: "limassol",
        },
        listing,
      ),
    ).toBe(true);
    expect(savedSearchMatches({ minPrice: 500 }, listing)).toBe(false);
    expect(savedSearchMatches({ intent: "wanted" }, listing)).toBe(false);
  });

  it("only lets the creator withdraw and the counterparty accept or decline", () => {
    const offer = {
      actorId: buyer,
      createdBy: buyer,
      buyerId: buyer,
      sellerId: seller,
      status: "pending" as const,
    };
    expect(canRespondToOffer(offer, "withdrawn")).toBe(true);
    expect(canRespondToOffer(offer, "accepted")).toBe(false);
    expect(canRespondToOffer({ ...offer, actorId: seller }, "accepted")).toBe(
      true,
    );
    expect(
      canRespondToOffer({ ...offer, actorId: crypto.randomUUID() }, "declined"),
    ).toBe(false);
    expect(
      canRespondToOffer(
        { ...offer, actorId: seller, status: "withdrawn" },
        "accepted",
      ),
    ).toBe(false);
  });

  it("requires a distinct recipient, owned item, and bounded cash adjustment for trades", () => {
    expect(
      validTradeProposal({
        proposerId: buyer,
        recipientId: seller,
        ownsOfferedListing: true,
        cashAdjustment: 50,
      }),
    ).toBe(true);
    expect(
      validTradeProposal({
        proposerId: buyer,
        recipientId: buyer,
        ownsOfferedListing: true,
        cashAdjustment: 0,
      }),
    ).toBe(false);
    expect(
      validTradeProposal({
        proposerId: buyer,
        recipientId: seller,
        ownsOfferedListing: false,
        cashAdjustment: 0,
      }),
    ).toBe(false);
    expect(
      validTradeProposal({
        proposerId: buyer,
        recipientId: seller,
        ownsOfferedListing: true,
        cashAdjustment: -1,
      }),
    ).toBe(false);
  });
});

describe("Phase 2 request validation", () => {
  it("rejects spoofed message and offer identities", () => {
    expect(
      messageSchema.safeParse({
        body: "Still available?",
        clientId: crypto.randomUUID(),
      }).success,
    ).toBe(true);
    expect(
      messageSchema.safeParse({
        body: "hi",
        clientId: crypto.randomUUID(),
        senderId: seller,
      }).success,
    ).toBe(false);
    expect(
      offerSchema.safeParse({ conversationId: conversation, amount: 450 })
        .success,
    ).toBe(true);
    expect(
      offerSchema.safeParse({ conversationId: conversation, amount: -1 })
        .success,
    ).toBe(false);
  });

  it("validates trade and saved-search bounds", () => {
    expect(
      tradeSchema.safeParse({
        conversationId: conversation,
        offeredListingId: buyer,
        cashAdjustment: 10,
        note: "Trade plus cash",
      }).success,
    ).toBe(true);
    expect(
      tradeSchema.safeParse({
        conversationId: conversation,
        offeredListingId: null,
        cashAdjustment: 10,
      }).success,
    ).toBe(false);
    expect(
      tradeSchema.safeParse({
        conversationId: conversation,
        offeredListingId: buyer,
        cashAdjustment: 1_000_001,
      }).success,
    ).toBe(false);
    expect(
      savedSearchSchema.safeParse({ name: "GPU", minPrice: 600, maxPrice: 300 })
        .success,
    ).toBe(false);
    expect(
      savedSearchSchema.safeParse({
        name: "GPU",
        searchTerm: "4070",
        enabled: true,
      }).success,
    ).toBe(true);
    expect(savedSearchUpdateSchema.safeParse({ enabled: false }).success).toBe(
      true,
    );
  });
});
