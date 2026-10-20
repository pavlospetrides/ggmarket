import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  current: {
    category_id: "11111111-1111-4111-8111-111111111111",
    product_id: null as string | null,
    attributes: {} as Record<string, unknown>,
  },
  category: {
    id: "11111111-1111-4111-8111-111111111111",
    slug: "controllers",
    attribute_schema: {} as Record<string, unknown>,
  },
  updatePayload: null as Record<string, unknown> | null,
}));

vi.mock("@/lib/auth", () => ({
  getUser: vi.fn(async () => ({ id: "seller-1" })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from(table: string) {
      let operation: "select" | "update" = "select";
      const query = {
        select() { return query; },
        eq() { return query; },
        ilike() { return query; },
        limit() { return query; },
        update(payload: Record<string, unknown>) {
          operation = "update";
          state.updatePayload = payload;
          return query;
        },
        async maybeSingle() { return { data: null, error: null }; },
        async single() {
          if (table === "listings" && operation === "select") return { data: state.current, error: null };
          if (table === "categories") return { data: state.category, error: null };
          if (table === "listings" && operation === "update") return { data: { id: "listing-1", status: "active" }, error: null };
          return { data: null, error: null };
        },
      };
      return query;
    },
  })),
}));

vi.mock("@/lib/validation", async () => import("../lib/validation"));
vi.mock("@/lib/security", async () => import("../lib/security"));
vi.mock("@/lib/gaming-taxonomy", async () => import("../lib/gaming-taxonomy"));

import { PATCH } from "../app/api/listings/[id]/route";

const validUpdate = {
  title: "Updated listing title",
  description: "A detailed and honest description of this listing.",
  price: 250,
  condition: "good",
  location: "Athens",
  shipping: true,
  meetup: false,
  status: "active",
};

async function patch(body: Record<string, unknown>) {
  return PATCH(new Request("https://ggmarket.test/api/listings/listing-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }), { params: Promise.resolve({ id: "listing-1" }) });
}

describe("listing PATCH taxonomy integrity", () => {
  beforeEach(() => {
    state.current = {
      category_id: "11111111-1111-4111-8111-111111111111",
      product_id: null,
      attributes: {},
    };
    state.category = {
      id: "11111111-1111-4111-8111-111111111111",
      slug: "controllers",
      attribute_schema: {},
    };
    state.updatePayload = null;
  });

  it("leaves legacy taxonomy untouched when only ordinary listing fields change", async () => {
    state.current.attributes = {
      platform: "Mystery Station 2000",
      seller_note: "Imported legacy record",
    };

    const response = await patch(validUpdate);

    expect(response.status).toBe(200);
    expect(state.updatePayload).not.toHaveProperty("attributes");
    expect(state.updatePayload).not.toHaveProperty("category_id");
    expect(state.updatePayload).not.toHaveProperty("product_id");
  });

  it("applies the selected category attribute schema to submitted edits", async () => {
    state.category.attribute_schema = { warranty: { type: "boolean" } };

    const response = await patch({
      ...validUpdate,
      attributes: {
        taxonomy_version: "1",
        subcategory: "gamepad",
        model: "DualSense",
        compatibility: ["ps5"],
        warranty: "yes",
      },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Some product details are invalid for this category." });
    expect(state.updatePayload).toBeNull();
  });

  it("retains unknown legacy attributes while accepting a controlled compatibility array", async () => {
    state.category.slug = "peripherals";
    state.current.attributes = { seller_note: "Keep this note" };

    const response = await patch({
      ...validUpdate,
      attributes: {
        taxonomy_version: "1",
        subcategory: "headset",
        compatibility: ["ps5", "windows-pc"],
      },
    });

    expect(response.status).toBe(200);
    expect(state.updatePayload?.attributes).toEqual({
      seller_note: "Keep this note",
      taxonomy_version: "1",
      subcategory: "headset",
      compatibility: ["ps5", "windows-pc"],
    });
  });

  it("preserves historical physical format data while ignoring submitted replacements", async () => {
    state.category.slug = "games";
    state.current.attributes = { physical_format: "umd", seller_note: "Imported legacy record" };

    const response = await patch({
      ...validUpdate,
      attributes: {
        taxonomy_version: "1",
        subcategory: "game",
        family: "playstation",
        platform: "psp",
        physical_format: "blu-ray-disc",
      },
    });

    expect(response.status).toBe(200);
    expect(state.updatePayload?.attributes).toEqual({
      physical_format: "umd",
      seller_note: "Imported legacy record",
      taxonomy_version: "1",
      subcategory: "game",
      family: "playstation",
      platform: "psp",
    });
  });

  it("validates the final merged attributes against the category schema", async () => {
    state.category.slug = "peripherals";
    state.category.attribute_schema = { warranty: { type: "boolean" } };
    state.current.attributes = { warranty: "unknown legacy value", seller_note: "Keep this note" };

    const response = await patch({
      ...validUpdate,
      attributes: {
        taxonomy_version: "1",
        subcategory: "headset",
        compatibility: ["ps5"],
      },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Some product details are invalid for this category." });
    expect(state.updatePayload).toBeNull();
  });

  it("accepts a complete dependent CPU payload and preserves unrelated legacy metadata", async () => {
    state.category.slug = "pc-components";
    state.current.attributes = { seller_note: "Includes invoice", legacy_import_id: "old-42" };

    const response = await patch({
      ...validUpdate,
      attributes: {
        taxonomy_version: "1",
        subcategory: "cpu",
        manufacturer: "intel",
        socket: "lga1700",
        cpu_family: "core-i7",
        cpu_generation: "12th-gen",
        cpu_model: "core-i7-12700k",
      },
    });

    expect(response.status).toBe(200);
    expect(state.updatePayload?.attributes).toMatchObject({
      seller_note: "Includes invoice",
      legacy_import_id: "old-42",
      subcategory: "cpu",
      manufacturer: "intel",
      socket: "lga1700",
      cpu_model: "core-i7-12700k",
    });
  });

  it("accepts controlled PC compatibility arrays and rejects incompatible dependent selections", async () => {
    state.category.slug = "pc-components";

    const caseResponse = await patch({
      ...validUpdate,
      attributes: {
        taxonomy_version: "1",
        subcategory: "case",
        case_size: "mid-tower",
        motherboard_support: ["atx", "micro-atx"],
        exact_model: "Fractal North",
      },
    });
    expect(caseResponse.status).toBe(200);

    const invalidCpuResponse = await patch({
      ...validUpdate,
      attributes: {
        taxonomy_version: "1",
        subcategory: "cpu",
        manufacturer: "intel",
        socket: "am5",
        cpu_family: "core-i7",
        cpu_generation: "12th-gen",
        cpu_model: "core-i7-12700k",
      },
    });
    expect(invalidCpuResponse.status).toBe(400);
  });
});
