import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/utils", () => ({ cn: (...values: Array<string | undefined>) => values.filter(Boolean).join(" ") }));
vi.mock("@/lib/gg-card", async () => import("../lib/gg-card"));
vi.mock("@/components/ui/lanyard-badge", async () => import("../components/ui/lanyard-badge"));
import { GGCardSection } from "../components/gg-card-section";
import GGCardExperience from "../components/gg-card-experience";

const identity = { displayName: "Ada Player", username: "ada" };
const card = {
  slogan: "Ready player",
  themeId: "gg-purple" as const,
  isPublic: false,
  textColor: "#123456",
  frontPatternColor: "#ABCDEF",
};
const render = (props: Parameters<typeof GGCardSection>[0]) => renderToStaticMarkup(createElement(GGCardSection, props));

describe("Lootriva Card profile section", () => {
  it("renders owner view and customization controls with the product description", () => {
    const html = render({ own: true, identity, card });
    expect(html).toContain("My Lootriva Card");
    expect(html).toContain("Your gaming identity, your style.");
    expect(html).toContain("View My Card");
    expect(html).toContain("Customize Card");
  });

  it("does not disclose a private or missing card on a public profile", () => {
    expect(render({ own: false, identity, card: null })).toBe("");
  });

  it("offers a read-only viewer for a public card without owner controls", () => {
    const html = render({ own: false, identity, card: { ...card, isPublic: true } });
    expect(html).toContain("Lootriva Card");
    expect(html).toContain("View Lootriva Card");
    expect(html).not.toContain("Customize Card");
  });

  it("renders hostile display names and slogans as escaped text", () => {
    const html = renderToStaticMarkup(createElement(GGCardExperience, {
      card: { ...card, slogan: "<img src=x onerror=alert(1)>", isPublic: true },
      displayName: "<script>alert(1)</script>",
      username: "safe-user",
    }));
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
  });

  it("renders typography and front geometry with independent colors", () => {
    const html = renderToStaticMarkup(createElement(GGCardExperience, {
      card,
      displayName: identity.displayName,
      username: identity.username,
    }));
    expect(html).toContain("background:#171329;color:#123456");
    expect(html).toContain("color:#ABCDEF");
    expect(html).toMatch(/color:#123456[^>]*><svg[^>]+/);
    expect(html).toMatch(/class="[^"]*top-4[^"]*left-4[^"]*"/);
    expect(html).not.toMatch(/class="[^"]*top-4[^"]*right-4[^"]*"/);
  });
});
