import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { readJson } from "@/lib/security";
import { getLatestSellerVerification } from "@/lib/seller-growth";
import { createClient } from "@/lib/supabase/server";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: privateHeaders });
  const application = await getLatestSellerVerification(user.id);
  return NextResponse.json({ application }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  if (!isFeatureEnabled("SELLER_VERIFICATION_ENABLED")) {
    return NextResponse.json({ error: "Seller verification is not accepting applications." }, { status: 403, headers: privateHeaders });
  }
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: privateHeaders });
  const body = await readJson(request);
  const statement = body && typeof body === "object" && !Array.isArray(body) && typeof (body as { statement?: unknown }).statement === "string"
    ? (body as { statement: string }).statement.trim()
    : "";
  if (statement.length < 20 || statement.length > 2000) {
    return NextResponse.json({ error: "Provide a statement between 20 and 2,000 characters." }, { status: 400, headers: privateHeaders });
  }
  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("submit_seller_verification", { application_text: statement });
  if (error) {
    const status = error.code === "42901" ? 429 : error.code === "23505" ? 409 : 400;
    return NextResponse.json({ error: status === 429 ? "Application limit reached. Please try again later." : "The application could not be submitted." }, { status, headers: privateHeaders });
  }
  return NextResponse.json({ application: data }, { headers: privateHeaders });
}

