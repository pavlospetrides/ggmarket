import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { listingSchema } from "@/lib/validation";
import { readJson } from "@/lib/security";
import { sanitizeTaxonomyAttributesForWrite, validateTaxonomyAttributes } from "@/lib/gaming-taxonomy";
import type { ListingAttributes } from "@/lib/types";

type AttributeRule = { type?: "string" | "number" | "boolean" };
function validAttributes(attributes: ListingAttributes, schema: unknown) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema)) return true;
  return Object.entries(attributes).every(([key, value]) => { const rule = (schema as Record<string, AttributeRule>)[key]; return !rule?.type || (!Array.isArray(value) && typeof value === rule.type); });
}

export async function POST(request: Request) {
  const user = await getUser(); if (!user) return NextResponse.json({ error: "Your session has expired. Please log in again." }, { status: 401 });
  const parsed = listingSchema.safeParse(await readJson(request)); if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid listing." }, { status: 400 });
  const supabase = await createClient();
  const { data: existing } = await supabase!.from("listings").select("id,status").eq("seller_id", user.id).contains("attributes", { _request_id: parsed.data.requestId }).maybeSingle();
  if (existing) return NextResponse.json(existing);
  const { data: category, error: categoryError } = await supabase!.from("categories").select("id,slug,attribute_schema").eq("id", parsed.data.categoryId).eq("active", true).single();
  if (categoryError || !category) return NextResponse.json({ error: "Please choose a valid category." }, { status: 400 });
  const attributes = sanitizeTaxonomyAttributesForWrite(parsed.data.attributes);
  if (!validAttributes(attributes, category.attribute_schema)) return NextResponse.json({ error: "Some product details are invalid for this category." }, { status: 400 });
  const taxonomyValidation = validateTaxonomyAttributes(category.slug, attributes);
  if (!taxonomyValidation.success) return NextResponse.json({ error: taxonomyValidation.error }, { status: 400 });
  const { data: product } = await supabase!.from("product_catalog").select("id").eq("category_id", category.id).ilike("name", parsed.data.productName).limit(1).maybeSingle();
  const { data, error } = await supabase!.from("listings").insert({ seller_id: user.id, category_id: category.id, product_id: product?.id ?? null, title: parsed.data.title, description: parsed.data.description, price: parsed.data.price, currency: "EUR", condition: parsed.data.condition, location: parsed.data.location, shipping_available: parsed.data.shipping, meetup_available: parsed.data.meetup, attributes: { ...attributes, product_name: parsed.data.productName, _request_id: parsed.data.requestId }, status: "draft" }).select("id,status").single();
  if (error?.code === "23505") {
    const { data: duplicate } = await supabase!.from("listings").select("id,status").eq("seller_id", user.id).contains("attributes", { _request_id: parsed.data.requestId }).maybeSingle();
    if (duplicate) return NextResponse.json(duplicate);
  }
  if (error) { console.error("Listing create failed", { code: error.code }); return NextResponse.json({ error: "Your listing could not be created." }, { status: 400 }); }
  return NextResponse.json(data, { status: 201 });
}
