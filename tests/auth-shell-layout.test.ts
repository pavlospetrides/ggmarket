import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { AuthShell } from "../components/auth-shell";

describe("auth shell mobile isolation", () => {
  it("marks auth pages and removes fixed global chrome that can cover the primary action", async () => {
    const html = renderToStaticMarkup(AuthShell({ title: "Confirm", subtitle: "Safe", children: "Action" }));
    const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
    expect(html).toContain("data-auth-shell");
    expect(css).toContain("body:has([data-auth-shell]) .global-exchange-header");
    expect(css).toContain("body:has([data-auth-shell]) [data-mobile-navigation]");
    expect(css).toContain("body:has([data-auth-shell]) [data-site-footer]");
  });
});
