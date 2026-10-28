import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { calculateRatingSummary } from "@/lib/ratings";
import { createClient } from "@/lib/supabase/server";
import { readJson } from "@/lib/security";
import { ratingSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const sellerId = new URL(request.url).searchParams.get("sellerId");
  const parsed = ratingSchema.pick({ sellerId: true }).safeParse({ sellerId });
  if (!parsed.success) return NextResponse.json({ error: "Invalid seller." }, { status: 400 });
  if (parsed.data.sellerId === user.id) return NextResponse.json({ rating: null });
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Ratings are temporarily unavailable." }, { status: 503 });
  const { data, error } = await supabase.from("reviews")
    .select("rating,comment")
    .eq("reviewer_id", user.id)
    .eq("seller_id", parsed.data.sellerId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Your rating could not be loaded." }, { status: 400 });
  return NextResponse.json({ rating: data ?? null });
}

export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Log in to rate this user." }, { status: 401 });
  const parsed = ratingSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid rating." }, { status: 400 });
  }
  const { sellerId, rating, comment } = parsed.data;
  if (sellerId === user.id) return NextResponse.json({ error: "You cannot rate yourself." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Ratings are temporarily unavailable." }, { status: 503 });
  const [{ data: active }, { data: target, error: targetError }] = await Promise.all([
    supabase.rpc("is_active_user"),
    supabase.from("profiles").select("id").eq("id", sellerId).maybeSingle(),
  ]);
  if (active !== true) return NextResponse.json({ error: "This account cannot submit ratings." }, { status: 403 });
  if (targetError || !target) return NextResponse.json({ error: "This user is not available." }, { status: 404 });

  const existingResult = await supabase.from("reviews")
    .select("id")
    .eq("reviewer_id", user.id)
    .eq("seller_id", sellerId)
    .maybeSingle();
  if (existingResult.error) return NextResponse.json({ error: "The rating could not be saved." }, { status: 400 });

  let savedResult;
  let updated = Boolean(existingResult.data);
  if (existingResult.data) {
    savedResult = await supabase.from("reviews")
      .update({ rating, comment })
      .eq("id", existingResult.data.id)
      .eq("reviewer_id", user.id)
      .select("id,reviewer_id,rating,comment,created_at")
      .single();
  } else {
    savedResult = await supabase.from("reviews")
      .insert({ reviewer_id: user.id, seller_id: sellerId, rating, comment })
      .select("id,reviewer_id,rating,comment,created_at")
      .single();
    if (savedResult.error?.code === "23505") {
      updated = true;
      savedResult = await supabase.from("reviews")
        .update({ rating, comment })
        .eq("reviewer_id", user.id)
        .eq("seller_id", sellerId)
        .select("id,reviewer_id,rating,comment,created_at")
        .single();
    }
  }
  if (savedResult.error || !savedResult.data) {
    return NextResponse.json({ error: "The rating could not be saved." }, { status: 400 });
  }

  const [{ data: reviewer }, { data: rows, error: summaryError }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
    supabase.from("reviews").select("rating").eq("seller_id", sellerId).limit(1000),
  ]);
  if (summaryError) return NextResponse.json({ error: "The rating was saved, but the profile summary could not be refreshed." }, { status: 500 });
  const summary = calculateRatingSummary((rows ?? []).map((row) => row.rating));
  return NextResponse.json({
    updated,
    summary,
    review: {
      id: savedResult.data.id,
      reviewerId: savedResult.data.reviewer_id,
      rating: Number(savedResult.data.rating),
      comment: savedResult.data.comment ?? undefined,
      createdAt: savedResult.data.created_at,
      reviewerName: reviewer?.display_name ?? "GGMarket member",
    },
  });
}
