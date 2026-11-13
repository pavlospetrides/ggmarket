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
    const message = status === 429 ? "Application limit reached. Please try again later." : status === 409 ? "An application is already under review or approved." : "The application could not be submitted.";
    return NextResponse.json({ error: message }, { status, headers: privateHeaders });
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return NextResponse.json({ error: "The application could not be confirmed. Please refresh your status before trying again." }, { status: 502, headers: privateHeaders });
  }
  const safeFields = ["id", "seller_id", "status", "application_note", "decision_reason", "reviewed_at", "resubmission_eligible_at", "created_at", "updated_at"] as const;
  const application = Object.fromEntries(safeFields.filter((key) => Object.hasOwn(data, key)).map((key) => [key, data[key]]));
  return NextResponse.json({ application }, { headers: privateHeaders });
}

