import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeListingImage } from "../lib/listing-image-security";
import { IMAGE_UPLOAD_BODY_LIMIT_BYTES, readLimitedMultipartForm } from "../lib/security";

const onePixelPng = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("trusted listing image uploads", () => {
  it("decodes and normalizes a real image to bounded WebP", async () => {
    const result = await normalizeListingImage(onePixelPng);
    expect(result.contentType).toBe("image/webp");
    expect(result.extension).toBe("webp");
    expect(result.bytes.byteLength).toBeGreaterThan(0);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);
  });

  it("rejects spoofed MIME content and SVG markup", async () => {
    await expect(normalizeListingImage(new TextEncoder().encode("not-an-image"))).rejects.toThrow("valid image");
    await expect(normalizeListingImage(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'))).rejects.toThrow("valid image");
  });

  it("routes uploads through the trusted server boundary", () => {
    const wizard = read("components/sell-wizard.tsx");
    const migration = read("supabase/migrations/202610280001_trusted_listing_image_uploads.sql");
    expect(wizard).toContain("`/api/listings/${listingId}/images`");
    expect(wizard).not.toContain('.storage\n          .from("listing-images")\n          .upload');
    expect(migration).toContain('drop policy if exists "listing images storage own insert"');
    expect(migration).toContain('drop policy if exists "listing images storage own update"');
  });

  it("parses legitimate multipart uploads within the request-body limit", async () => {
    const form = new FormData();
    form.set("sortOrder", "0");
    form.set("image", new File([onePixelPng], "pixel.png", { type: "image/png" }));
    const request = new Request("http://localhost/upload", { method: "POST", body: form });

    const parsed = await readLimitedMultipartForm(request);
    expect(parsed?.get("sortOrder")).toBe("0");
    expect(parsed?.get("image")).toBeInstanceOf(File);
  });

  it("rejects multipart bodies that exceed either the declared or streamed limit", async () => {
    const declared = new Request("http://localhost/upload", {
      method: "POST",
      headers: {
        "content-type": "multipart/form-data; boundary=a",
        "content-length": String(IMAGE_UPLOAD_BODY_LIMIT_BYTES + 1),
      },
      body: "--a--\r\n",
    });
    const streamed = new Request("http://localhost/upload", {
      method: "POST",
      headers: { "content-type": "multipart/form-data; boundary=a" },
      body: new Uint8Array(IMAGE_UPLOAD_BODY_LIMIT_BYTES + 1),
    });

    await expect(readLimitedMultipartForm(declared)).resolves.toBeNull();
    await expect(readLimitedMultipartForm(streamed)).resolves.toBeNull();
  });
});
