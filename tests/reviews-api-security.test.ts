import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/validation", async () => import("../lib/validation"));
vi.mock("@/lib/ratings", async () => import("../lib/ratings"));
vi.mock("@/lib/security", async () => import("../lib/security"));

const accountA = "11111111-1111-4111-8111-111111111111";
const accountB = "22222222-2222-4222-8222-222222222222";

function request(body: unknown) {
  return new Request("https://ggmarket.test/api/reviews", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function query(result: unknown, writes: Array<{ method: string; value: unknown }>) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "limit"]) chain[method] = vi.fn(() => chain);
  chain.insert = vi.fn((value) => { writes.push({ method: "insert", value }); return chain; });
  chain.update = vi.fn((value) => { writes.push({ method: "update", value }); return chain; });
  chain.maybeSingle = vi.fn(async () => result);
  chain.single = vi.fn(async () => result);
  chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return chain;
}

describe("reviews API authorization", () => {
  beforeEach(() => {
    mocks.getUser.mockReset();
    mocks.createClient.mockReset();
  });

  it("rejects self-ratings before database access", async () => {
    mocks.getUser.mockResolvedValue({ id: accountA });
    const { POST } = await import("../app/api/reviews/route");
    const response = await POST(request({ sellerId: accountA, rating: 5 }));
    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects forged reviewer identity fields", async () => {
    mocks.getUser.mockResolvedValue({ id: accountA });
    const { POST } = await import("../app/api/reviews/route");
    const response = await POST(request({ sellerId: accountB, reviewerId: accountB, rating: 5 }));
    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("rejects a declared oversized body before database access", async () => {
    mocks.getUser.mockResolvedValue({ id: accountA });
    const { POST } = await import("../app/api/reviews/route");
    const response = await POST(new Request("https://ggmarket.test/api/reviews", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "70000" },
      body: JSON.stringify({ sellerId: accountB, rating: 5 }),
    }));
    expect(response.status).toBe(400);
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it("derives reviewer identity from auth and inserts one reviewer-target pair", async () => {
    mocks.getUser.mockResolvedValue({ id: accountA });
    const writes: Array<{ method: string; value: unknown }> = [];
    const results = [
      { data: { id: accountB }, error: null },
      { data: null, error: null },
      { data: { id: "review-1", reviewer_id: accountA, rating: 4, comment: "Good", created_at: "2026-10-20" }, error: null },
      { data: { display_name: "Account A" }, error: null },
      { data: [{ rating: 4 }], error: null },
    ];
    const supabase = {
      rpc: vi.fn(async () => ({ data: true, error: null })),
      from: vi.fn(() => query(results.shift(), writes)),
    };
    mocks.createClient.mockResolvedValue(supabase);
    const { POST } = await import("../app/api/reviews/route");
    const response = await POST(request({ sellerId: accountB, rating: 4, comment: " Good " }));
    expect(response.status).toBe(200);
    expect(writes).toContainEqual({
      method: "insert",
      value: { reviewer_id: accountA, seller_id: accountB, rating: 4, comment: "Good" },
    });
    expect((await response.json()).summary).toEqual({ average: 4, count: 1 });
  });

  it("updates an existing pair rather than inserting a duplicate", async () => {
    mocks.getUser.mockResolvedValue({ id: accountA });
    const writes: Array<{ method: string; value: unknown }> = [];
    const results = [
      { data: { id: accountB }, error: null },
      { data: { id: "review-1" }, error: null },
      { data: { id: "review-1", reviewer_id: accountA, rating: 2, comment: null, created_at: "2026-10-20" }, error: null },
      { data: { display_name: "Account A" }, error: null },
      { data: [{ rating: 2 }, { rating: 4 }], error: null },
    ];
    mocks.createClient.mockResolvedValue({
      rpc: vi.fn(async () => ({ data: true, error: null })),
      from: vi.fn(() => query(results.shift(), writes)),
    });
    const { POST } = await import("../app/api/reviews/route");
    const response = await POST(request({ sellerId: accountB, rating: 2 }));
    expect(response.status).toBe(200);
    expect(writes.some((write) => write.method === "insert")).toBe(false);
    expect(writes).toContainEqual({ method: "update", value: { rating: 2, comment: null } });
    expect((await response.json()).updated).toBe(true);
  });
});
