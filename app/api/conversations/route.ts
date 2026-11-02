import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { readJson, readUrlEncodedForm } from "@/lib/security";
import { conversationSchema } from "@/lib/validation";

function isFormRequest(request: Request) {
  return request.headers.get("content-type")?.toLowerCase().includes("application/x-www-form-urlencoded") ?? false;
}

function publicOrigin(request: Request) {
  const url = new URL(request.url);
  return getPublicRequestOrigin(request.headers, url.protocol) ?? url.origin;
}

function formRedirect(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, publicOrigin(request)), 303);
}

function formError(message: string, status: number) {
  return new NextResponse(
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>GGMarket</title><body><main><h1>Conversation not opened</h1><p>${message}</p><p><a href="/marketplace">Return to marketplace</a></p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function requestBody(request: Request) {
  if (!isFormRequest(request)) return readJson(request);
  const body = await readUrlEncodedForm(request);
  return { listingId: body?.get("listingId") };
}

export async function POST(request: Request) {
  const form = isFormRequest(request);
  const parsed = conversationSchema.safeParse(await requestBody(request));
  if (!parsed.success) {
    return form
      ? formError("The selected listing is invalid.", 400)
      : NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  }

  const user = await getUser();
  if (!user) {
    return form
      ? formRedirect(request, `/login?next=${encodeURIComponent(`/listing/${parsed.data.listingId}`)}`)
      : NextResponse.json({ error: "Please log in to message sellers." }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase!.rpc("start_conversation", {
    target_listing_id: parsed.data.listingId,
  });
  if (error || typeof data !== "string") {
    return form
      ? formError("This conversation could not be started.", 400)
      : NextResponse.json({ error: "This conversation could not be started." }, { status: 400 });
  }

  return form
    ? formRedirect(request, `/messages/${data}`)
    : NextResponse.json({ id: data });
}
