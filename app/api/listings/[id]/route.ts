import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listingUpdateSchema } from "@/lib/validation";
import { readJson } from "@/lib/security";
import { mergeListingAttributes, sanitizeTaxonomyAttributesForWrite, validateTaxonomyAttributes } from "@/lib/gaming-taxonomy";
import type { ListingAttributes } from "@/lib/types";

type AttributeRule = { type?: "string" | "number" | "boolean" };
function validAttributes(attributes: ListingAttributes, schema: unknown) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return true;
  return Object.entries(attributes).every(([key, value]) => {
    const rule = (schema as Record<string, AttributeRule>)[key];
    return !rule?.type || (!Array.isArray(value) && typeof value === rule.type);
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params;
  const body = await readJson(request); const supabase = await createClient();
  if (typeof body === "object" && body !== null && (body as { action?: unknown }).action === "publish") { const { count } = await supabase!.from("listing_images").select("id", { count: "exact", head: true }).eq("listing_id", id); if (!count) return NextResponse.json({ error: "Add at least one photo before publishing." }, { status: 400 }); const { data, error } = await supabase!.from("listings").update({ status: "active" }).eq("id", id).eq("seller_id", user.id).eq("status", "draft").select("id,status").single(); if (error) { console.error("Listing publish failed", { code: error.code }); return NextResponse.json({ error: "The listing could not be published." }, { status: 400 }); } return NextResponse.json(data); }
  const parsed = listingUpdateSchema.safeParse(body); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid listing." }, { status: 400 });
  const { data: current, error: currentError } = await supabase!.from("listings").select("category_id,product_id,attributes").eq("id", id).eq("seller_id", user.id).single();
  if (currentError || !current) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const categoryId = parsed.data.categoryId ?? current.category_id;
  const existingAttributes = (current.attributes && typeof current.attributes === "object" && !Array.isArray(current.attributes) ? current.attributes : {}) as ListingAttributes;
  const taxonomyChanged = parsed.data.categoryId !== undefined || parsed.data.attributes !== undefined;
  const metadataChanged = taxonomyChanged || parsed.data.productName !== undefined;
  let category: { id: string; slug: string; attribute_schema: unknown } | null = null;
  if (metadataChanged) {
    const { data, error } = await supabase!.from("categories").select("id,slug,attribute_schema").eq("id", categoryId).eq("active", true).single();
    if (error || !data) return NextResponse.json({ error: "Please choose a valid category." }, { status: 400 });
    category = data;
  }
  let attributes: ListingAttributes | undefined;
  if (taxonomyChanged) {
    const submittedAttributes = sanitizeTaxonomyAttributesForWrite(parsed.data.attributes ?? {});
    attributes = mergeListingAttributes(existingAttributes, {
      ...submittedAttributes,
      ...(parsed.data.productName ? { product_name: parsed.data.productName } : {}),
    });
    if (!validAttributes(attributes, category!.attribute_schema)) return NextResponse.json({ error: "Some product details are invalid for this category." }, { status: 400 });
    const taxonomyValidation = validateTaxonomyAttributes(category!.slug, attributes);
    if (!taxonomyValidation.success) return NextResponse.json({ error: taxonomyValidation.error }, { status: 400 });
  } else if (parsed.data.productName) {
    attributes = { ...existingAttributes, product_name: parsed.data.productName };
  }
  let productId = current.product_id;
  if (parsed.data.productName) {
    const { data: product } = await supabase!.from("product_catalog").select("id").eq("category_id", categoryId).ilike("name", parsed.data.productName).limit(1).maybeSingle();
    productId = product?.id ?? null;
  }
  const update = {
    title: parsed.data.title,
    description: parsed.data.description,
    price: parsed.data.price,
    condition: parsed.data.condition,
    location: parsed.data.location,
    shipping_available: parsed.data.shipping,
    meetup_available: parsed.data.meetup,
    status: parsed.data.status,
    ...(parsed.data.categoryId !== undefined ? { category_id: categoryId } : {}),
    ...(parsed.data.productName !== undefined ? { product_id: productId } : {}),
    ...(attributes !== undefined ? { attributes } : {}),
  };
  const { data, error } = await supabase!.from("listings").update(update).eq("id", id).eq("seller_id", user.id).select("id,status").single();
  if (error) { console.error("Listing update failed", { code: error.code }); return NextResponse.json({ error: "The listing could not be updated." }, { status: 400 }); } return NextResponse.json(data);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); const { id } = await params; const supabase = await createClient();
  const { data: listing } = await supabase!.from("listings").select("id,status,listing_images(storage_path)").eq("id", id).eq("seller_id", user.id).maybeSingle(); if (!listing) return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  const paths = (listing.listing_images ?? []).map((image: { storage_path: string }) => image.storage_path); if (paths.length) { const { error } = await supabase!.storage.from("listing-images").remove(paths); if (error) return NextResponse.json({ error: "Listing images could not be removed." }, { status: 400 }); }
  const { error } = await supabase!.from("listings").delete().eq("id", id).eq("seller_id", user.id); if (error) return NextResponse.json({ error: "Listing could not be deleted." }, { status: 400 }); return NextResponse.json({ ok: true });
}
