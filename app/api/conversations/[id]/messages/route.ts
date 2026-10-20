import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getPublicRequestOrigin } from "@/lib/request-security";
import { readJson } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { conversationIdSchema, messageSchema } from "@/lib/validation";

const messageColumns = "id,conversation_id,sender_id,body,client_id,created_at";

type RouteContext = { params: Promise<{ id: string }> };

function isFormRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data");
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
    `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>GGMarket</title><body><main><h1>Message not sent</h1><p>${message}</p><p>Return to the conversation and try again.</p></main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

async function requestBody(request: Request) {
  if (!isFormRequest(request)) return readJson(request);
  const form = await request.formData();
  return { body: form.get("message"), clientId: form.get("clientId") };
}

function jsonOrFormError(request: Request, message: string, status: number) {
  return isFormRequest(request)
    ? formError(message, status)
    : NextResponse.json({ error: message }, { status });
}

async function routeIdentity(context: RouteContext) {
  const { id } = await context.params;
  const parsed = conversationIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function GET(_request: Request, context: RouteContext) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = await routeIdentity(context);
  if (!id) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Messages are unavailable." }, { status: 503 });
  const { data, error } = await supabase
    .from("messages")
    .select(messageColumns)
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) {
    const forbidden = error.code === "42501";
    return NextResponse.json(
      { error: forbidden ? "You cannot read this conversation." : "Messages could not be loaded." },
      { status: forbidden ? 403 : 400 },
    );
  }
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getUser();
  if (!user) {
    const id = await routeIdentity(context);
    return isFormRequest(request) && id
      ? formRedirect(request, `/login?next=${encodeURIComponent(`/messages/${id}`)}`)
      : NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = await routeIdentity(context);
  if (!id) return jsonOrFormError(request, "Invalid conversation.", 400);
  const parsed = messageSchema.safeParse(await requestBody(request));
  if (!parsed.success) {
    return jsonOrFormError(request, parsed.error.issues[0]?.message ?? "Invalid message.", 400);
  }

  const supabase = await createClient();
  if (!supabase) return jsonOrFormError(request, "Messages are unavailable.", 503);
  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: user.id,
      body: parsed.data.body,
      client_id: parsed.data.clientId,
    })
    .select(messageColumns)
    .single();

  if (error?.code === "23505") {
    const { data: duplicate } = await supabase
      .from("messages")
      .select(messageColumns)
      .eq("sender_id", user.id)
      .eq("client_id", parsed.data.clientId)
      .eq("conversation_id", id)
      .maybeSingle();
    if (duplicate) {
      return isFormRequest(request)
        ? formRedirect(request, `/messages/${id}`)
        : NextResponse.json(duplicate);
    }
  }

  if (error) {
    if (error.code === "42501") {
      return jsonOrFormError(request, "You cannot send messages in this conversation.", 403);
    }
    const message = error.code === "P0001"
      ? "You are sending messages too quickly."
      : "Message could not be sent.";
    return jsonOrFormError(request, message, 400);
  }

  return isFormRequest(request)
    ? formRedirect(request, `/messages/${id}`)
    : NextResponse.json(data, { status: 201 });
}

export async function PATCH(_request: Request, context: RouteContext) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = await routeIdentity(context);
  if (!id) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Read status is unavailable." }, { status: 503 });
  const { error } = await supabase
    .from("conversation_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json(
      { error: error.code === "42501" ? "You cannot update this conversation." : "Read status could not be updated." },
      { status: error.code === "42501" ? 403 : 400 },
    );
  }
  const { error: notificationError } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("type", "message")
    .eq("href", `/messages/${id}`)
    .is("read_at", null);
  if (notificationError) {
    return NextResponse.json({ error: "Conversation was read, but its notification could not be updated." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
