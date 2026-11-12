import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { ListingMediaImage } from "../components/listing-media-image";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("listing media delivery", () => {
  it("renders an authorized signed source directly instead of through the Next optimizer", () => {
    const signedSource =
      "https://project.supabase.co/storage/v1/object/sign/listing-images/user/listing/image/card.webp?token=secret";

    const markup = renderToStaticMarkup(createElement(ListingMediaImage, {
      src: signedSource,
      alt: "Listing photo",
      width: 320,
      height: 240,
    }));

    expect(markup).toContain(`src="${signedSource.replaceAll("&", "&amp;")}"`);
    expect(markup).not.toContain("/_next/image");
  });

  it("routes every persisted listing-image surface through the direct-media boundary", () => {
    const consumers = [
      "components/listing-card.tsx",
      "components/discovery-listing-card.tsx",
      "components/listing-gallery.tsx",
      "components/manage-listing-form.tsx",
      "components/ui/favorite-lanyard-rail.tsx",
      "app/messages/page.tsx",
    ];

    for (const path of consumers) {
      const source = read(path);
      expect(source, path).toContain("ListingMediaImage");
      expect(source, path).not.toContain('import Image from "next/image"');
    }
  });

  it("keeps static brand media on the normal Next image pipeline", () => {
    const home = read("app/page.tsx");

    expect(home).toContain('import Image from "next/image"');
    expect(home).toContain('src="/images/brand/lootriva-hero-desktop.webp"');
  });
});
