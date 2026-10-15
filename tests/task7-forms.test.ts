import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("Task 7 accessible form contracts", () => {
  it("associates and focuses authentication errors while exposing busy state", () => {
    const auth = read("components/auth-form.tsx");
    const forgot = read("components/forgot-password-form.tsx");
    const reset = read("components/reset-password-form.tsx");

    expect(auth).toContain('id="auth-form-error"');
    expect(auth).toContain('aria-describedby={error ? "auth-form-error" : undefined}');
    expect(auth).toContain('aria-busy={loading}');
    expect(auth).toContain("errorRef.current?.focus()");
    expect(forgot).toContain('aria-busy={busy}');
    expect(forgot).toContain('aria-live="polite"');
    expect(reset).toContain('id="password-confirmation-error"');
    expect(reset).toContain('aria-invalid={Boolean(error)}');
    expect(reset).toContain("confirmationRef.current?.focus()");
  });

  it("warns only after account or listing forms become dirty", () => {
    const settings = read("components/settings-form.tsx");
    const manage = read("components/manage-listing-form.tsx");
    const sell = read("components/sell-wizard.tsx");

    for (const source of [settings, manage, sell]) {
      expect(source).toContain('addEventListener("beforeunload"');
      expect(source).toContain("Discard your unsaved changes?");
    }
    expect(settings).toContain("setDirty(true)");
    expect(settings).toContain("setDirty(false)");
    expect(manage).toContain("setDirty(true)");
    expect(manage).toContain("setDirty(false)");
    expect(sell).toContain("form.formState.isDirty");
  });

  it("connects sell validation and makes the photo control keyboard visible", () => {
    const sell = read("components/sell-wizard.tsx");

    expect(sell).toContain('htmlFor="listing-photos"');
    expect(sell).toContain('id="listing-photos"');
    expect(sell).toContain("focus-within:ring-2");
    expect(sell).toContain("shouldFocus: true");
    expect(sell).toContain('aria-invalid={Boolean(error("title"))}');
    expect(sell).toContain('aria-describedby={error("title") ? "title-error" : undefined}');
    expect(sell).toContain('id="title-error"');
    expect(sell).toContain('aria-live="polite"');
    expect(sell).not.toContain("transition-all");
  });

  it("provides verification empty, busy, and failure states", () => {
    const verification = read("components/item-verification.tsx");

    expect(verification).toContain("listings.length === 0");
    expect(verification).toContain("setBusyId(listingId)");
    expect(verification).toContain('aria-live="polite"');
    expect(verification).toContain('disabled={busyId !== ""}');
  });

  it("keeps protected task pages contained above mobile navigation", () => {
    for (const path of [
      "app/settings/page.tsx",
      "app/settings/verification/page.tsx",
      "app/sell/page.tsx",
      "app/listing/[id]/edit/page.tsx",
    ]) {
      const source = read(path);
      expect(source, path).toContain("min-w-0");
      expect(source, path).toContain("pb-28");
    }
  });
});
