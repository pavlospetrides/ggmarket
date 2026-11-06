import { existsSync, readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("service worker hydration safety", () => {
  it("never serves Next application scripts cache-first", () => {
    const worker = read("public/sw.js");
    expect(worker).toContain('const CACHE = "lootriva-shell-v1"');
    expect(worker).not.toContain('url.pathname.startsWith("/_next/static/")');
    expect(worker).toContain("self.skipWaiting()");
    expect(worker).toContain("self.clients.claim()");
  });

  it("deletes only known Lootriva and one-release legacy application caches", async () => {
    const source = read("public/sw.js");
    let activate: ((event: { waitUntil: (promise: Promise<unknown>) => void }) => void) | undefined;
    const deleted: string[] = [];
    let activation: Promise<unknown> | undefined;
    runInNewContext(source, {
      self: {
        addEventListener: (name: string, listener: typeof activate) => { if (name === "activate") activate = listener; },
        skipWaiting: async () => undefined,
        clients: { claim: async () => undefined },
        location: { origin: "https://lootriva.com" },
      },
      caches: {
        keys: async () => ["lootriva-shell-v0", "lootriva-shell-v1", "ggmarket-shell-v3", "unrelated-cache"],
        delete: async (key: string) => { deleted.push(key); return true; },
        open: async () => ({ addAll: async () => undefined }),
        match: async () => undefined,
      },
      URL,
      Promise,
      fetch: async () => undefined,
    });
    activate?.({ waitUntil: (promise) => { activation = promise; } });
    await activation;
    expect(deleted).toEqual(["lootriva-shell-v0", "ggmarket-shell-v3"]);
    expect(deleted).not.toContain("unrelated-cache");
  });

  it("checks for worker updates without using the HTTP cache", () => {
    const registration = read("public/sw-bootstrap.js");
    expect(registration).toContain('updateViaCache: "none"');
    expect(registration).toContain("registration.update()");
    expect(registration).toContain("getRegistrations()");
    expect(registration).toContain("registration.unregister()");
  });

  it("recovers from a stale controlling worker before React hydration", async () => {
    const path = new URL("../public/sw-bootstrap.js", import.meta.url);
    const source = existsSync(path) ? readFileSync(path, "utf8") : "";
    let unregistered = 0;
    let deleted = 0;
    let reloads = 0;
    const listeners = new Map<string, EventListener>();
    const storage = new Map<string, string>();
    const registration = { unregister: async () => { unregistered += 1; return true; } };
    const context = {
      document: { currentScript: { dataset: { environment: "development" } } },
      navigator: {
        serviceWorker: {
          controller: {},
          getRegistrations: async () => [registration],
          addEventListener: (name: string, listener: EventListener) => listeners.set(name, listener),
        },
      },
      caches: {
        keys: async () => ["lootriva-shell-v0", "ggmarket-shell-v2", "unrelated-cache"],
        delete: async (key: string) => { if (/^(?:lootriva|ggmarket)-shell-/.test(key)) deleted += 1; return true; },
      },
      location: { reload: () => { reloads += 1; } },
      sessionStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      Promise,
    };

    runInNewContext(source, context);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(unregistered).toBe(1);
    expect(deleted).toBe(2);
    expect(reloads).toBe(1);
  });

  it("loads the recovery bootstrap before the application body", () => {
    const layout = read("app/layout.tsx");
    expect(layout).toContain('<Script src="/sw-bootstrap.js" strategy="beforeInteractive"');
    expect(layout).toContain('data-environment={process.env.NODE_ENV}');
  });

  it("never reloads an already hydrated page when the worker controller changes", async () => {
    const source = read("public/sw-bootstrap.js");
    let reloads = 0;
    let controllerChange: (() => void) | undefined;
    const documentElement = { dataset: { ggHydrated: "true" } };
    runInNewContext(source, {
      document: { currentScript: { dataset: { environment: "production" } }, documentElement },
      navigator: {
        serviceWorker: {
          controller: {},
          addEventListener: (name: string, listener: () => void) => { if (name === "controllerchange") controllerChange = listener; },
          register: async () => ({ update: async () => undefined }),
          getRegistrations: async () => [],
        },
      },
      caches: { keys: async () => [] },
      location: { reload: () => { reloads += 1; } },
      sessionStorage: { getItem: () => null, setItem: () => undefined },
      window: { addEventListener: () => undefined },
      Promise,
      globalThis: { caches: { keys: async () => [] } },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    controllerChange?.();

    expect(reloads).toBe(0);
  });
});
