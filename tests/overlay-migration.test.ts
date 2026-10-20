import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("listing overlays", () => {
  it("uses the shared dialog for the full-screen gallery without replacing arrow navigation", () => {
    const gallery = read("components/listing-gallery.tsx");

    expect(gallery).toContain('from "./ui/dialog"');
    expect(gallery).toContain("<Dialog open={expanded} onOpenChange={setExpanded}>");
    expect(gallery).toContain("<DialogTrigger asChild>");
    expect(gallery).toContain('closeLabel="Close gallery"');
    expect(gallery).toContain('event.key === "ArrowLeft"');
    expect(gallery).toContain('event.key === "ArrowRight"');
    expect(gallery).not.toContain('role="dialog"');
    expect(gallery).not.toContain('document.body.style.overflow');
  });

  it("uses the shared dialog for reporting while retaining the submission contract", () => {
    const report = read("components/report-button.tsx");

    expect(report).toContain('from "./ui/dialog"');
    expect(report).toContain("<Dialog open={open} onOpenChange={setOpen}>");
    expect(report).toContain("<DialogTrigger asChild>");
    expect(report).toContain("<DialogTitle>Report listing</DialogTitle>");
    expect(report).toContain('closeLabel="Close report dialog"');
    expect(report).toContain('fetch("/api/reports"');
    expect(report).not.toContain('role="dialog"');
  });
});
