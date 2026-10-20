import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { favoriteSchema } from "@/lib/validation";
import { readJson } from "@/lib/security";
import { getPublicRequestOrigin, isTrustedMutationRequest } from "@/lib/request-security";

type FavoriteIntent = "add" | "remove";

type FavoriteRequest = {
  listingId: string;
  intent: FavoriteIntent;
  form: boolean;
  returnPath: string;
};

function publicOrigin(request: Request) {
  const url = new URL(request.url);
  return getPublicRequestOrigin(request.headers, url.protocol) ?? url.origin;
}

function formRedirect(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, publicOrigin(request)), 303);
}

function formError(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>GGMarket</title><body><main><h1>Favorite not updated</h1><p>${message}</p><p><a href="/marketplace">Return to marketplace</a></p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function parseFavoriteRequest(request: Request): Promise<FavoriteRequest | null> {
  const isForm = request.headers.get("content-type")?.toLowerCase().includes("application/x-www-form-urlencoded") ?? false;
  if (isForm) {
    const body = await request.formData();
    const parsed = favoriteSchema.safeParse({ listingId: body.get("listingId") });
    if (!parsed.success) return null;

    let returnPath = "/marketplace";
    const referer = request.headers.get("referer");
    if (referer) {
      try {
        const refererUrl = new URL(referer);
        returnPath = `${refererUrl.pathname}${refererUrl.search}`;
      } catch {
        // The fixed marketplace fallback is intentionally used for malformed referrers.
      }
    }

    return {
      listingId: parsed.data.listingId,
      intent: body.get("intent") === "remove" ? "remove" : "add",
      form: true,
      returnPath,
    };
  }

  const parsed = favoriteSchema.safeParse(await readJson(request));
  if (!parsed.success) return null;
  return {
    listingId: parsed.data.listingId,
    intent: request.method === "DELETE" ? "remove" : "add",
    form: false,
    returnPath: "/marketplace",
  };
}

async function handle(request: Request, forcedIntent?: FavoriteIntent) {
  const parsed = await parseFavoriteRequest(request);
  const isForm = request.headers.get("content-type")?.toLowerCase().includes("application/x-www-form-urlencoded") ?? false;
  if (!parsed) {
    return isForm ? formError("The selected listing is invalid.", 400) : NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }
  if (!isTrustedMutationRequest(request.headers, new URL(request.url).protocol)) {
    return parsed.form ? formError("This request could not be verified.", 403) : NextResponse.json({ error: "This request could not be verified." }, { status: 403 });
  }

  const intent = forcedIntent ?? parsed.intent;
  const user = await getUser();
  if (!user) {
    if (parsed.form) return formRedirect(request, `/login?next=${encodeURIComponent(parsed.returnPath)}`);
    return NextResponse.json({ error: "Please log in to save listings." }, { status: 401 });
  }

  const supabase = await createClient();
  if (intent === "remove") {
    const { error } = await supabase!
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", parsed.listingId);
    if (error) {
      console.error("Favorite delete failed", { code: error.code });
      return parsed.form ? formError("The favorite could not be removed.", 400) : NextResponse.json({ error: "The favorite could not be removed." }, { status: 400 });
    }
    return parsed.form ? formRedirect(request, parsed.returnPath) : NextResponse.json({ favorite: false });
  }

  const { data: listing } = await supabase!
    .from("listings")
    .select("id")
    .eq("id", parsed.listingId)
    .eq("status", "active")
    .maybeSingle();
  if (!listing) {
    return parsed.form ? formError("This listing is not available.", 404) : NextResponse.json({ error: "This listing is not available." }, { status: 404 });
  }

  const { error } = await supabase!
    .from("favorites")
    .upsert(
      { user_id: user.id, listing_id: parsed.listingId },
      { onConflict: "user_id,listing_id", ignoreDuplicates: true },
    );
  if (error) {
    console.error("Favorite create failed", { code: error.code });
    return parsed.form ? formError("The listing could not be saved.", 400) : NextResponse.json({ error: "The listing could not be saved." }, { status: 400 });
  }
  return parsed.form ? formRedirect(request, parsed.returnPath) : NextResponse.json({ favorite: true });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function DELETE(request: Request) {
  return handle(request, "remove");
}
