import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { readLimitedMultipartForm } from "@/lib/security";
import { createClient } from "@/lib/supabase/server";
import { conversationIdSchema, voiceMessageSchema } from "@/lib/validation";
import {
  MAX_VOICE_BYTES,
  baseVoiceMimeType,
  isAllowedVoiceFile,
  voiceExtension,
} from "@/lib/voice-message";

const messageColumns = "id,conversation_id,sender_id,body,message_type,attachment_path,attachment_mime,attachment_duration_ms,client_id,created_at";
const multipartLimit = MAX_VOICE_BYTES + 65_536;
type RouteContext = { params: Promise<{ id: string }> };

async function identity(context: RouteContext) {
  const { id } = await context.params;
  const parsed = conversationIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversationId = await identity(context);
  if (!conversationId) return NextResponse.json({ error: "Invalid conversation." }, { status: 400 });

  const form = await readLimitedMultipartForm(request, multipartLimit);
  const audio = form?.get("audio");
  const parsed = voiceMessageSchema.safeParse({
    clientId: form?.get("clientId"),
    durationMs: form?.get("durationMs"),
  });
  if (!parsed.success || !(audio instanceof File) || !isAllowedVoiceFile(audio)) {
    return NextResponse.json({ error: "Invalid voice recording." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Voice messages are unavailable." }, { status: 503 });
  const mime = baseVoiceMimeType(audio.type);
  const path = `${conversationId}/${user.id}/${crypto.randomUUID()}.${voiceExtension(mime)}`;
  const normalizedAudio = new Blob([await audio.arrayBuffer()], { type: mime });
  const { error: uploadError } = await supabase.storage
    .from("message-audio")
    .upload(path, normalizedAudio, { contentType: mime, upsert: false });
  if (uploadError) {
    const forbidden = uploadError.message.toLowerCase().includes("policy");
    return NextResponse.json(
      { error: forbidden ? "You cannot upload to this conversation." : "Voice recording could not be uploaded." },
      { status: forbidden ? 403 : 400 },
    );
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      body: "Voice message",
      client_id: parsed.data.clientId,
      message_type: "voice",
      attachment_path: path,
      attachment_mime: mime,
      attachment_duration_ms: parsed.data.durationMs,
    })
    .select(messageColumns)
    .single();

  if (error) {
    await supabase.storage.from("message-audio").remove([path]);
    if (error.code === "23505") {
      const { data: duplicate } = await supabase
        .from("messages")
        .select(messageColumns)
        .eq("conversation_id", conversationId)
        .eq("sender_id", user.id)
        .eq("client_id", parsed.data.clientId)
        .maybeSingle();
      if (duplicate) return NextResponse.json(duplicate);
    }
    return NextResponse.json(
      { error: error.code === "42501" ? "You cannot send messages in this conversation." : "Voice message could not be sent." },
      { status: error.code === "42501" ? 403 : 400 },
    );
  }
  return NextResponse.json(data, { status: 201 });
}

export async function GET(request: Request, context: RouteContext) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conversationId = await identity(context);
  const messageId = new URL(request.url).searchParams.get("messageId");
  if (!conversationId || !messageId || !conversationIdSchema.safeParse(messageId).success) {
    return NextResponse.json({ error: "Invalid voice message." }, { status: 400 });
  }
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Voice messages are unavailable." }, { status: 503 });
  const { data: message, error } = await supabase
    .from("messages")
    .select("attachment_path")
    .eq("id", messageId)
    .eq("conversation_id", conversationId)
    .eq("message_type", "voice")
    .maybeSingle();
  if (error || !message?.attachment_path) {
    return NextResponse.json({ error: "Voice message not found." }, { status: error?.code === "42501" ? 403 : 404 });
  }
  const { data, error: signingError } = await supabase.storage
    .from("message-audio")
    .createSignedUrl(message.attachment_path, 300);
  if (signingError || !data?.signedUrl) {
    return NextResponse.json({ error: "Voice message could not be opened." }, { status: 403 });
  }
  return NextResponse.json({ url: data.signedUrl }, { headers: { "cache-control": "private, no-store" } });
}
