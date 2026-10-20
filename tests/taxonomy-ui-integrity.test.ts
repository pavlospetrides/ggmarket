import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("taxonomy UI integrity contracts", () => {
  it("associates hierarchy errors with the selector level that is actually missing", () => {
    const source = read("components/taxonomy-selector.tsx");

    expect(source).toContain("const missingLevel");
    expect(source).toContain('aria-invalid={missingLevel === "one"}');
    expect(source).toContain('aria-invalid={missingLevel === "two"}');
    expect(source).toContain('role="alert"');
    expect(source).toContain('aria-live="assertive"');
  });

  it("explains that narrow structured filters can exclude legacy listings", () => {
    const source = read("components/marketplace-browser.tsx");

    expect(source).toContain("hasStructuredFilters");
    expect(source).toContain("Older or unclassified listings may not appear");
  });

  it("renders boolean taxonomy fields as Any, Yes, and No buyer filters", () => {
    const source = read("components/marketplace-browser.tsx");

    expect(source).toContain('field.type === "boolean"');
    expect(source).toContain('<option value="true">Yes</option>');
    expect(source).toContain('<option value="false">No</option>');
  });

  it("resolves buyer PC fields from complete URL state and refreshes dependent selectors", () => {
    const source = read("components/marketplace-browser.tsx");

    expect(source).toContain("getTaxonomyFields(selectedCategorySlug, taxonomyDisplayParams as ListingAttributes)");
    expect(source).toContain("pcHardwareDependentKeys");
    expect(source).toContain('field.type === "multiselect"');
    expect(source).toContain("updateTaxonomyFilterParams(taxonomyDisplayParams, key, nextValue)");
  });

  it("renders listing specifications in a deliberate stable order", () => {
    const source = read("app/listing/[id]/page.tsx");

    expect(source).toContain("LISTING_ATTRIBUTE_ORDER");
    expect(source).toContain("orderedAttributes");
    expect(source).toContain("localeCompare");
    expect(source).toContain("{orderedAttributes.length ?");
  });

  it("shows structured hardware details in the seller preview", () => {
    const source = read("components/sell-wizard.tsx");

    expect(source).toContain("previewTaxonomyAttributes");
    expect(source).toContain("formatTaxonomyAttribute");
    expect(source).toContain("Preview specifications");
  });

  it("does not require untouched taxonomy fields during ordinary legacy edits", () => {
    expect(read("components/taxonomy-attribute-fields.tsx")).toContain("enforceRequired && field.required");
    expect(read("components/manage-listing-form.tsx")).toContain("enforceRequired={taxonomyDirty}");
  });

  it("uses the selected PC product type when clearing seller field dependencies", () => {
    const source = read("components/taxonomy-attribute-fields.tsx");

    expect(source).toContain("updatePcHardwareAttribute(resolvedAttributes, key, value)");
  });
});
