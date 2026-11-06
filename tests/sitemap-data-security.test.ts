import { beforeEach, describe, expect, it, vi } from "vitest";

type QueryOperation = { method: string; args: unknown[] };
type CapturedQuery = { table: string; operations: QueryOperation[] };
type CapturedClient = { url: string; key: string; options: unknown };

const queryState = vi.hoisted(() => ({
  clients: [] as CapturedClient[],
  queries: [] as CapturedQuery[],
}));

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: (url: string, key: string, options: unknown) => {
    queryState.clients.push({ url, key, options });
    return { from: (table: string) => {
      const query: CapturedQuery = { table, operations: [] };
      queryState.queries.push(query);

      const builder = {
        select(...args: unknown[]) {
          query.operations.push({ method: "select", args });
          return builder;
        },
        eq(...args: unknown[]) {
          query.operations.push({ method: "eq", args });
          return builder;
        },
        is(...args: unknown[]) {
          query.operations.push({ method: "is", args });
          return builder;
        },
        order(...args: unknown[]) {
          query.operations.push({ method: "order", args });
          return builder;
        },
        range(...args: unknown[]) {
          query.operations.push({ method: "range", args });
          return builder;
        },
        then<TResult1 = { data: never[]; error: null; count: number }>(
          onfulfilled?: ((value: { data: never[]; error: null; count: number }) => TResult1 | PromiseLike<TResult1>) | null,
        ) {
          return Promise.resolve({ data: [], error: null, count: 0 }).then(onfulfilled);
        },
      };
      return builder;
    } };
  },
}));

import {
  getPublicListingSitemapRows,
  getPublicProfileSitemapRows,
  getPublicSitemapCounts,
} from "../lib/sitemap-data";

describe("anonymous sitemap query security", () => {
  beforeEach(() => {
    queryState.clients.length = 0;
    queryState.queries.length = 0;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
  });

  it("uses inner RLS-visible relationships without requesting protected profile fields", async () => {
    await getPublicSitemapCounts();
    await getPublicListingSitemapRows(1);
    await getPublicProfileSitemapRows(1);

    expect(queryState.clients).toEqual([
      {
        url: "https://example.supabase.co",
        key: "test-anon-key",
        options: { auth: { persistSession: false, autoRefreshToken: false } },
      },
      {
        url: "https://example.supabase.co",
        key: "test-anon-key",
        options: { auth: { persistSession: false, autoRefreshToken: false } },
      },
      {
        url: "https://example.supabase.co",
        key: "test-anon-key",
        options: { auth: { persistSession: false, autoRefreshToken: false } },
      },
    ]);
    expect(queryState.queries).toHaveLength(4);
    expect(queryState.queries.map((query) => query.operations[0])).toEqual([
      {
        method: "select",
        args: ["id,seller:profiles!listings_seller_id_fkey!inner(id)", { count: "exact", head: true }],
      },
      {
        method: "select",
        args: ["id,listings:listings!listings_seller_id_fkey!inner(id)", { count: "exact", head: true }],
      },
      {
        method: "select",
        args: ["id,status,published_at,updated_at,seller:profiles!listings_seller_id_fkey!inner(id)"],
      },
      {
        method: "select",
        args: ["username,updated_at,listings:listings!listings_seller_id_fkey!inner(status,updated_at)"],
      },
    ]);
    expect(queryState.queries.flatMap((query) => query.operations)).not.toContainEqual(
      expect.objectContaining({ method: "is" }),
    );
  });
});
