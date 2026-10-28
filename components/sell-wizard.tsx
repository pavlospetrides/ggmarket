"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Package,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { conditions, formatPrice } from "@/lib/constants";
import type { Category } from "@/lib/types";
import { isAllowedImageFile } from "@/lib/security";
import { createClientUuid } from "@/lib/client-id";
import { formatTaxonomyAttribute, getTaxonomyFields } from "@/lib/gaming-taxonomy";
import type { ListingAttributes } from "@/lib/types";
import { TaxonomyAttributeFields } from "./taxonomy-attribute-fields";
import { buildListingTaxonomyAttributes, isTaxonomySelectionComplete, TaxonomySelector, type TaxonomySelection } from "./taxonomy-selector";
import { useHydrated } from "./use-hydrated";

const schema = z
  .object({
    title: z.string().trim().min(6).max(120),
    description: z.string().trim().min(1).max(5000),
    price: z.number().positive().max(1_000_000),
    budgetMin: z.number().positive().max(1_000_000),
    categoryId: z.string().uuid(),
    productName: z.string().trim().min(2).max(160),
    intent: z.enum(["sale", "wanted", "trade", "sale_or_trade"]),
    condition: z.enum(["new", "like_new", "good", "fair", "parts"]),
    location: z.string().trim().min(2).max(120),
    shipping: z.boolean(),
    meetup: z.boolean(),
  })
  .refine((value) => value.shipping || value.meetup, {
    path: ["shipping"],
    message: "Choose at least one delivery option",
  })
  .refine((value) => value.intent !== "wanted" || value.budgetMin <= value.price, { path: ["budgetMin"], message: "Minimum budget must not exceed maximum budget" });
type Values = z.infer<typeof schema>;
type Photo = { file: File; url: string };
const steps = [
  "Category",
  "Product",
  "Photos",
  "Details",
  "Price & delivery",
  "Preview",
];

export function SellWizard({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [requestId] = useState(() => createClientUuid());
  const [step, setStep] = useState(0);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [message, setMessage] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [taxonomySelection, setTaxonomySelection] = useState<TaxonomySelection>({ categorySlug: "" });
  const [taxonomyAttributes, setTaxonomyAttributes] = useState<ListingAttributes>({});
  const [taxonomyError, setTaxonomyError] = useState("");
  const photoInputRef = useRef<HTMLInputElement>(null);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      price: 0,
      budgetMin: 1,
      categoryId: "",
      productName: "",
      intent: "sale",
      condition: "good",
      location: "",
      shipping: true,
      meetup: true,
    },
  });
  const values = useWatch({ control: form.control });
  const hasUnsavedChanges = form.formState.isDirty || photos.length > 0;
  const category = categories.find((item) => item.id === values.categoryId);
  const previewTaxonomyAttributes = category
    ? Object.entries(buildListingTaxonomyAttributes(taxonomySelection, taxonomyAttributes))
      .filter(([key]) => key !== "taxonomy_version" && !key.startsWith("_"))
      .slice(0, 8)
      .map(([key, attributeValue]) => formatTaxonomyAttribute(key, attributeValue))
    : [];
  const error = (name: keyof Values) => form.formState.errors[name]?.message;

  useEffect(() => {
    if (!hasUnsavedChanges || publishing) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const confirmLinkNavigation = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest("a[href]");
      if (!link || link.getAttribute("href")?.startsWith("#")) return;
      if (!window.confirm("Discard your unsaved changes?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    document.addEventListener("click", confirmLinkNavigation, true);
    return () => {
      window.removeEventListener("beforeunload", warnBeforeUnload);
      document.removeEventListener("click", confirmLinkNavigation, true);
    };
  }, [hasUnsavedChanges, publishing]);

  function addPhotos(files: FileList | null) {
    if (!files) return;
    setPhotoError("");
    const candidates = Array.from(files);
    const valid = candidates.filter(isAllowedImageFile);
    if (valid.length !== candidates.length) {
      setPhotoError(
        "Some files were skipped. Use JPG, PNG, or WebP files up to 10 MB.",
      );
      photoInputRef.current?.focus();
    }
    const next = valid
      .slice(0, 8 - photos.length)
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((old) => [...old, ...next]);
  }
  function removePhoto(index: number) {
    setPhotos((current) => {
      URL.revokeObjectURL(current[index].url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }
  function selectCategory(item: Category) {
    form.setValue("categoryId", item.id, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    setTaxonomySelection({ categorySlug: item.slug });
    setTaxonomyAttributes({});
    setTaxonomyError("");
  }
  async function next() {
    if (step === 2 && !photos.length) {
      setPhotoError("Add at least one photo.");
      photoInputRef.current?.focus();
      return;
    }
    let fields: (keyof Values)[] = [];
    if (step === 0) fields = ["categoryId"];
    if (step === 1) fields = ["productName"];
    if (step === 3) fields = ["title", "description", "condition"];
    if (step === 4) fields = ["price", ...(values.intent === "wanted" ? ["budgetMin" as const] : []), "location", "shipping", "meetup"];
    if (fields.length && !(await form.trigger(fields, { shouldFocus: true }))) return;
    if (step === 0 && !isTaxonomySelectionComplete(taxonomySelection)) {
      setTaxonomyError("Choose the complete product path before continuing.");
      return;
    }
    if (step === 1 && category) {
      const missing = getTaxonomyFields(category.slug, buildListingTaxonomyAttributes(taxonomySelection, taxonomyAttributes)).find((field) => {
        const fieldValue = taxonomyAttributes[field.key];
        return field.required && (fieldValue === undefined || fieldValue === "" || (Array.isArray(fieldValue) && fieldValue.length === 0));
      });
      if (missing) {
        setTaxonomyError(`Choose ${missing.label.toLowerCase()} before continuing.`);
        return;
      }
    }
    setTaxonomyError("");
    setStep((current) => Math.min(5, current + 1));
  }
  async function publish(data: Values) {
    if (publishing) return;
    setPublishing(true);
    setMessage("Creating draft…");
    let listingId = "";
    try {
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          description: data.description,
          price: data.price,
          categoryId: data.categoryId,
          productName: data.productName,
          condition: data.condition,
          location: data.location,
          shipping: data.shipping,
          meetup: data.meetup,
          attributes: buildListingTaxonomyAttributes(taxonomySelection, taxonomyAttributes, {
            intent: data.intent,
            ...(data.intent === "wanted" && { wanted_budget_min: data.budgetMin, wanted_budget_max: data.price }),
          }),
          requestId,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Listing creation failed");
      listingId = result.id;
      if (result.status === "active") {
        router.push(`/listing/${listingId}`);
        return;
      }
      setMessage("Uploading photos…");
      for (const [index, photo] of photos.entries()) {
        const form = new FormData();
        form.set("image", photo.file);
        form.set("sortOrder", String(index));
        const uploadResponse = await fetch(`/api/listings/${listingId}/images`, {
          method: "POST",
          body: form,
        });
        if (!uploadResponse.ok) {
          const uploadResult = await uploadResponse.json().catch(() => null);
          throw new Error(uploadResult?.error || `Photo ${index + 1} could not be uploaded.`);
        }
      }
      setMessage("Publishing…");
      const publishResponse = await fetch(`/api/listings/${listingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      const publishResult = await publishResponse.json();
      if (!publishResponse.ok)
        throw new Error(
          publishResult.error || "Listing could not be published",
        );
      setMessage("Published successfully");
      router.push(`/listing/${listingId}`);
      router.refresh();
    } catch (reason) {
      if (listingId)
        await fetch(`/api/listings/${listingId}`, { method: "DELETE" }).catch(() => undefined);
      setMessage(
        reason instanceof Error
          ? reason.message
          : "Listing could not be published.",
      );
    } finally {
      setPublishing(false);
    }
  }
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-7 rounded-2xl border border-white/[.055] bg-white/[.018] p-4 sm:p-5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[#b9aaff]">
            Step {step + 1} of {steps.length}
          </span>
          <span className="text-[var(--muted)]">{steps[step]}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#7658ff] to-[#a28fff] shadow-[0_0_16px_rgba(132,104,255,.45)] transition-[width] duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>
        <ol className="mt-4 hidden grid-cols-6 gap-2 sm:grid">{steps.map((label, index) => <li key={label} className={`truncate text-[10px] font-bold ${index <= step ? "text-[#b9aaff]" : "text-[var(--muted)]"}`}><span className={`mr-1.5 inline-grid size-5 place-items-center rounded-full ${index < step ? "bg-[var(--success)] text-[#07100b]" : index === step ? "bg-[var(--primary)] text-white" : "bg-[var(--surface-alt)]"}`}>{index < step ? <Check className="size-3" /> : index + 1}</span>{label}</li>)}</ol>
      </div>
      <form data-hydrated={hydrated} onSubmit={form.handleSubmit(publish)} className="surface-panel p-5 sm:p-8" aria-busy={!hydrated || publishing}>
        <p className={hydrated ? "sr-only" : "mb-4 text-sm text-[var(--muted)]"} role="status" aria-live="polite">{hydrated ? message : "Preparing listing formâ€¦"}</p>
        <fieldset disabled={!hydrated || publishing} className="min-w-0 border-0 p-0">
        <legend className="sr-only">Listing information</legend>
        <div className="min-h-[390px]">
          {step === 0 && (
            <fieldset>
              <legend className="text-2xl font-black">
                What are you listing?
              </legend>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Choose an intent and the closest category.
              </p>
              <div className="mt-5">
                <label className="label" htmlFor="listing-intent">
                  Listing type
                </label>
                <select
                  id="listing-intent"
                  className="input"
                  {...form.register("intent")}
                >
                  <option value="sale">For sale</option>
                  <option value="wanted">Wanted</option>
                  <option value="trade">Trade</option>
                  <option value="sale_or_trade">Sale or trade</option>
                </select>
              </div>
              <input type="hidden" {...form.register("categoryId")} />
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3" role="group" aria-label="Listing category" aria-describedby={error("categoryId") ? "categoryId-error" : undefined}>
                {categories.map((item) => (
                  <button
                    type="button"
                    data-gg-debug-control="sell-category"
                    key={item.id}
                    onClick={() => selectCategory(item)}
                    aria-pressed={values.categoryId === item.id}
                    className={`cursor-pointer rounded-[var(--radius-md)] border p-4 text-sm transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--focus)] has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[var(--background)] active:scale-[.98] ${values.categoryId === item.id ? "border-[var(--primary)] bg-[#211a3a] shadow-[0_0_0_3px_rgba(132,104,255,.1)]" : "border-[var(--border)] bg-[#0b0f17] hover:border-[var(--border-hover)] hover:bg-[var(--surface-alt)]"}`}
                  >
                    <span className="font-bold">{item.name}</span>
                  </button>
                ))}
              </div>
              {error("categoryId") && (
                <p id="categoryId-error" className="mt-3 text-sm text-[var(--danger)]">
                  {error("categoryId")}
                </p>
              )}
              {category ? <TaxonomySelector selection={taxonomySelection} onChange={(next) => { setTaxonomySelection(next); setTaxonomyError(""); }} error={taxonomyError} /> : null}
            </fieldset>
          )}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-black">Which product or model?</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                We&apos;ll link it to the product catalog when an exact match
                exists.
              </p>
              <div className="mt-6">
                <label className="label" htmlFor="productName">
                  Product or model
                </label>
                <input
                  className="input"
                  id="productName"
                  aria-invalid={Boolean(error("productName"))}
                  aria-describedby={error("productName") ? "productName-error" : undefined}
                  placeholder={
                    category?.slug === "pc-components"
                      ? "e.g. NVIDIA RTX 4070 SUPER"
                      : "e.g. PlayStation 5 Slim"
                  }
                  {...form.register("productName")}
                />
                {error("productName") && (
                  <p id="productName-error" className="mt-2 text-sm text-[var(--danger)]">
                    {error("productName")}
                  </p>
                )}
              </div>
              {category ? <TaxonomyAttributeFields categorySlug={category.slug} selectionAttributes={buildListingTaxonomyAttributes(taxonomySelection, {})} values={taxonomyAttributes} onChange={(next) => { setTaxonomyAttributes(next); setTaxonomyError(""); }} /> : null}
              {taxonomyError ? <p className="mt-3 text-sm text-[var(--danger)]" role="alert">{taxonomyError}</p> : null}
              <div className="mt-5 rounded-xl border border-[var(--border)] bg-[#0d1017] p-4 text-sm text-[var(--muted)]">
                <Package className="mb-2 size-5 text-[#a995ff]" />
                Enter the exact model where possible.
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-black">Add photos</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Add up to 8 clear photos. At least one is required.
              </p>
              <label htmlFor="listing-photos" className="mt-6 grid min-h-48 cursor-pointer place-items-center rounded-[var(--radius-lg)] border-2 border-dashed border-[#3b4356] bg-[#0a0e15] text-center transition focus-within:ring-2 focus-within:ring-[var(--focus)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--background)] hover:border-[#7965cb] hover:bg-[#0d111b]">
                <input
                  id="listing-photos"
                  ref={photoInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  aria-invalid={Boolean(photoError)}
                  aria-describedby={photoError ? "photo-error" : undefined}
                  onChange={(event) => addPhotos(event.target.files)}
                />
                <span>
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-[#252039] text-[#b7a7ff]">
                    <Upload />
                  </span>
                  <strong className="mt-3 block">Choose photos</strong>
                  <span className="mt-1 block text-xs text-[var(--muted)]">
                    JPG, PNG or WebP · 10 MB each
                  </span>
                </span>
              </label>
              {photoError && (
                <p id="photo-error" role="alert" className="mt-3 text-sm text-[var(--danger)]">
                  {photoError}
                </p>
              )}
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {photos.map((photo, index) => (
                    <div
                      className="relative aspect-square overflow-hidden rounded-xl"
                      key={photo.url}
                    >
                      <Image
                        src={photo.url}
                        fill
                        alt={`Upload preview ${index + 1}`}
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-black/70"
                        aria-label={`Remove photo ${index + 1}`}
                        onClick={() => removePhoto(index)}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-black">Tell buyers about it</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="label" htmlFor="title">
                    Listing title
                  </label>
                  <input
                    id="title"
                    className="input"
                    aria-invalid={Boolean(error("title"))}
                    aria-describedby={error("title") ? "title-error" : undefined}
                    {...form.register("title")}
                  />
                  {error("title") && (
                    <p id="title-error" className="mt-2 text-sm text-[var(--danger)]">
                      {error("title")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="label" htmlFor="condition-sell">
                    Condition
                  </label>
                  <select
                    id="condition-sell"
                    className="input"
                    {...form.register("condition")}
                  >
                    {conditions.map(([condition, label]) => (
                      <option key={condition} value={condition}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label" htmlFor="description">
                    Description
                  </label>
                  <textarea
                    id="description"
                    className="input min-h-32"
                    aria-invalid={Boolean(error("description"))}
                    aria-describedby={error("description") ? "description-error" : undefined}
                    {...form.register("description")}
                  />
                  {error("description") && (
                    <p id="description-error" className="mt-2 text-sm text-[var(--danger)]">
                      {error("description")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-black">Price and delivery</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <label className="label" htmlFor="price">
                    {values.intent === "wanted" ? "Maximum budget (€)" : "Price (€)"}
                  </label>
                  <input
                    id="price"
                    className="input text-xl font-bold"
                    type="number"
                    min="1"
                    max="1000000"
                    step="1"
                    {...form.register("price", { valueAsNumber: true })}
                  />
                  {error("price") && (
                    <p className="mt-2 text-sm text-[var(--danger)]">
                      {error("price")}
                    </p>
                  )}
                </div>
                {values.intent === "wanted" && (
                  <div>
                    <label className="label" htmlFor="budget-min">Minimum budget (€)</label>
                    <input id="budget-min" className="input" type="number" min="1" max="1000000" step="1" {...form.register("budgetMin", { valueAsNumber: true })} />
                    {error("budgetMin") && <p className="mt-2 text-sm text-[var(--danger)]">{error("budgetMin")}</p>}
                  </div>
                )}
                <div>
                  <label className="label" htmlFor="sell-location">
                    Location
                  </label>
                  <input
                    id="sell-location"
                    className="input"
                    maxLength={120}
                    {...form.register("location")}
                  />
                </div>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-[#0a0e15] p-4 transition hover:border-[var(--border-hover)]">
                  <span>
                    <strong className="block">Shipping available</strong>
                    <small className="text-[var(--muted)]">
                      Agree details with the buyer
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    className="size-5 accent-[#7758ff]"
                    {...form.register("shipping")}
                  />
                </label>
                <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--border)] bg-[#0a0e15] p-4 transition hover:border-[var(--border-hover)]">
                  <span>
                    <strong className="block">Local meetup</strong>
                    <small className="text-[var(--muted)]">
                      Meet in a safe public place
                    </small>
                  </span>
                  <input
                    type="checkbox"
                    className="size-5 accent-[#7758ff]"
                    {...form.register("meetup")}
                  />
                </label>
                {error("shipping") && (
                  <p className="text-sm text-[var(--danger)]">
                    {error("shipping")}
                  </p>
                )}
              </div>
            </div>
          )}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-black">Ready to publish?</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Check the details buyers will see.
              </p>
              <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--border)] bg-[#0d1017]">
                <div className="grid aspect-[16/7] place-items-center bg-[#171b26]">
                  {photos[0] ? (
                    <div className="relative size-full">
                      <Image
                        src={photos[0].url}
                        fill
                        alt="Listing preview"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <Camera className="size-10 text-[#626979]" />
                  )}
                </div>
                <div className="p-5">
                  <span className="text-xs text-[#a99aff]">
                    {category?.name}
                  </span>
                  <h3 className="mt-1 text-xl font-bold">{values.title}</h3>
                  <p className="price mt-2 text-2xl">
                    {formatPrice(Number(values.price || 0))}
                  </p>
                  <p className="mt-3 line-clamp-3 text-sm text-[var(--muted)]">
                    {values.description}
                  </p>
                  {previewTaxonomyAttributes.length ? <div className="mt-5 border-t border-[var(--border)] pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-[.12em] text-[var(--muted)]">Preview specifications</h4>
                    <dl className="mt-3 grid gap-2 min-[390px]:grid-cols-2">
                      {previewTaxonomyAttributes.map((attribute) => <div className="rounded-lg bg-[var(--surface-alt)] px-3 py-2" key={attribute.label}>
                        <dt className="text-[11px] text-[var(--muted)]">{attribute.label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold [overflow-wrap:anywhere]">{attribute.value}</dd>
                      </div>)}
                    </dl>
                  </div> : null}
                </div>
              </div>
              {message && (
                 <p className="mt-4 text-center text-sm text-[#b8a8ff]">
                  {message}
                </p>
              )}
            </div>
          )}
        </div>
        <div className="mt-7 flex gap-3 border-t border-[var(--border)] pt-5">
          {step > 0 && (
            <button
              disabled={publishing}
              type="button"
              onClick={() => setStep((current) => current - 1)}
              className="btn-secondary"
            >
              <ArrowLeft className="size-4" /> Back
            </button>
          )}
          {step === 5 ? (
            <button
              disabled={publishing}
              type="submit"
              className="btn-primary ml-auto min-w-32"
            >
              <Check className="size-4" />{" "}
              {publishing ? "Publishing…" : "Publish"}
            </button>
          ) : (
            <button
              disabled={publishing || (step === 0 && !values.categoryId)}
              type="button"
              onClick={(event) => {
                event.preventDefault();
                void next();
              }}
              className="btn-primary ml-auto min-w-32"
            >
              Next <ArrowRight className="size-4" />
            </button>
          )}
        </div>
        </fieldset>
      </form>
    </div>
  );
}
