import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Component, Loader2 } from "../components/ui/loader-2";
import BrowseLoading from "../app/browse/loading";
import MarketplaceLoading from "../app/marketplace/loading";

describe("Loader2", () => {
  it("renders the original three-shape animation as one named status", () => {
    const html = renderToStaticMarkup(
      createElement(Loader2, {
        label: "Loading marketplace",
        size: "compact",
        delayed: true,
      }),
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain("Loading marketplace");
    expect(html).toContain('data-loader-size="compact"');
    expect(html).toContain('data-loader-delayed="true"');
    expect(html.match(/<svg/g)).toHaveLength(3);
    expect(html).toContain('<circle r="32" cy="40" cx="40"></circle>');
    expect(html).toContain('<polygon points="43 8 79 72 7 72"></polygon>');
    expect(html).toContain('<rect height="64" width="64" y="8" x="8"></rect>');
  });

  it("can be decorative inside an already labelled pending control", () => {
    const html = renderToStaticMarkup(
      createElement(Loader2, { decorative: true, size: "compact" }),
    );

    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('role="status"');
    expect(html).not.toContain('aria-live="polite"');
  });

  it("keeps the supplied Component export compatible", () => {
    const html = renderToStaticMarkup(createElement(Component));

    expect(html.match(/<svg/g)).toHaveLength(3);
    expect(html).toContain('data-loader-size="standard"');
  });
});

describe("route loading boundaries", () => {
  it.each([
    ["browse", BrowseLoading, "Loading Browse"],
    ["marketplace", MarketplaceLoading, "Loading marketplace"],
  ])("renders the shared loader for the %s boundary without a fixed overlay", (_, Boundary, label) => {
    const html = renderToStaticMarkup(createElement(Boundary));

    expect(html).toContain('role="status"');
    expect(html).toContain(label);
    expect(html.match(/data-loader-shape=/g)).toHaveLength(3);
    expect(html).not.toMatch(/class="[^"]*\bfixed\b/);
  });
});
