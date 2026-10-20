import { describe, expect, it } from "vitest";
import { favoriteSchema, listingSchema, listingUpdateSchema, profileSchema, reportSchema } from "../lib/validation";
import { isAllowedImageFile, readJson, safeRedirectPath } from "../lib/security";

const validListing = { title: "Test graphics card", description: "A detailed and honest description of the test item.", price: 400, categoryId: "00000000-0000-4000-8000-000000000001", productName: "Test GPU", condition: "good", location: "Test City", shipping: true, meetup: false, attributes: { warranty: false }, requestId: "00000000-0000-4000-8000-000000000002" };
describe("Phase 1 server validation", () => {
  it("accepts a valid listing and rejects unsafe values", () => { expect(listingSchema.safeParse(validListing).success).toBe(true); expect(listingSchema.safeParse({ ...validListing, price: -1 }).success).toBe(false); expect(listingSchema.safeParse({ ...validListing, title: "x" }).success).toBe(false); expect(listingSchema.safeParse({ ...validListing, sellerId: crypto.randomUUID() }).success).toBe(false); });
  it("accepts bounded string arrays but rejects nested or oversized listing attributes", () => {
    expect(listingSchema.safeParse({ ...validListing, attributes: { compatibility: ["ps5", "windows-pc"] } }).success).toBe(true);
    expect(listingSchema.safeParse({ ...validListing, attributes: { motherboard_support: ["atx", "micro-atx"] } }).success).toBe(true);
    expect(listingSchema.safeParse({ ...validListing, attributes: { compatible_sockets: ["am4", "am5"] } }).success).toBe(true);
    expect(listingSchema.safeParse({ ...validListing, attributes: { arbitrary: ["x"] } }).success).toBe(false);
    expect(listingSchema.safeParse({ ...validListing, attributes: { compatibility: [["ps5"]] } }).success).toBe(false);
    expect(listingSchema.safeParse({ ...validListing, attributes: { compatibility: Array.from({ length: 33 }, (_, index) => `platform-${index}`) } }).success).toBe(false);
    expect(listingSchema.safeParse({ ...validListing, attributes: { vram_gb: Number.POSITIVE_INFINITY } }).success).toBe(false);
  });
  it("requires delivery and constrains status updates", () => { expect(listingSchema.safeParse({ ...validListing, shipping: false, meetup: false }).success).toBe(false); const update = { title: validListing.title, description: validListing.description, price: 1, condition: "good", location: "City", shipping: true, meetup: false, status: "active" }; expect(listingUpdateSchema.safeParse(update).success).toBe(true); expect(listingUpdateSchema.safeParse({ ...update, status: "admin_removed" }).success).toBe(false); });
  it("accepts one-character trimmed descriptions for create and edit but rejects blank or oversized text", () => {
    const update = { title: validListing.title, description: "A", price: 1, condition: "good", location: "City", shipping: true, meetup: false, status: "active" };
    expect(listingSchema.parse({ ...validListing, description: "  A  " }).description).toBe("A");
    expect(listingUpdateSchema.parse(update).description).toBe("A");
    for (const description of ["", "   "]) {
      expect(listingSchema.safeParse({ ...validListing, description }).success).toBe(false);
      expect(listingUpdateSchema.safeParse({ ...update, description }).success).toBe(false);
    }
    expect(listingSchema.safeParse({ ...validListing, description: "x".repeat(5001) }).success).toBe(false);
    expect(listingUpdateSchema.safeParse({ ...update, description: "x".repeat(5001) }).success).toBe(false);
  });
  it("validates identities and report enums", () => { expect(profileSchema.safeParse({ username: "valid.user", displayName: "Valid User", bio: "", location: "" }).success).toBe(true); expect(profileSchema.safeParse({ username: "<script>", displayName: "X" }).success).toBe(false); expect(favoriteSchema.safeParse({ listingId: "not-a-uuid" }).success).toBe(false); expect(reportSchema.safeParse({ listingId: crypto.randomUUID(), reason: "invented" }).success).toBe(false); });
});
describe("Security helpers", () => {
  it("only permits local redirect paths", () => { expect(safeRedirectPath("/settings")).toBe("/settings"); expect(safeRedirectPath("//evil.example")).toBe("/profile"); expect(safeRedirectPath("https://evil.example")).toBe("/profile"); expect(safeRedirectPath("/\\evil.example")).toBe("/profile"); });
  it("enforces image type and size", () => { expect(isAllowedImageFile({ type: "image/webp", size: 1024 })).toBe(true); expect(isAllowedImageFile({ type: "image/svg+xml", size: 1024 })).toBe(false); expect(isAllowedImageFile({ type: "image/jpeg", size: 11_000_000 })).toBe(false); expect(isAllowedImageFile({ type: "image/jpeg", size: 0 })).toBe(false); });
  it("rejects malformed and non-JSON request bodies", async () => {
    expect(await readJson(new Request("https://ggmarket.test", { method: "POST", headers: { "content-type": "application/json" }, body: "{" }))).toBeNull();
    expect(await readJson(new Request("https://ggmarket.test", { method: "POST", headers: { "content-type": "text/plain" }, body: "{}" }))).toBeNull();
    expect(await readJson(new Request("https://ggmarket.test", { method: "POST", headers: { "content-type": "application/json" }, body: '{"ok":true}' }))).toEqual({ ok: true });
  });
});
