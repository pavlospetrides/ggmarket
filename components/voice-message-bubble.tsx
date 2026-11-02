"use client";

import { AlertCircle, Play } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { formatVoiceDuration } from "@/lib/voice-message";
import { Loader2 } from "./ui/loader-2";

export function VoiceMessageBubble({
  conversationId,
  messageId,
  durationMs,
}: {
  conversationId: string;
  messageId: string;
  durationMs: number;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const load = useCallback(() => {
    setError("");
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/conversations/${conversationId}/voice?messageId=${encodeURIComponent(messageId)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json() as { url?: string; error?: string };
        if (!response.ok || !result.url) throw new Error(result.error || "Voice message could not be opened.");
        setUrl(result.url);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Voice message could not be opened.");
      });
    return () => controller.abort();
  }, [attempt, conversationId, messageId]);

  if (error) {
    return (
      <button type="button" onClick={load} className="flex min-h-11 items-center gap-2 text-left text-xs" aria-label="Retry loading voice message">
        <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
        <span>{error} Retry</span>
      </button>
    );
  }
  if (!url) return <Loader2 size="compact" delayed label="Loading voice message" />;
  return (
    <div className="min-w-[12rem] max-w-full" data-voice-message>
      <span className="mb-1 flex items-center gap-2 text-xs font-bold">
        <Play className="size-3.5 fill-current" aria-hidden="true" /> Voice message · {formatVoiceDuration(durationMs)}
      </span>
      <audio className="h-10 w-full max-w-[16rem]" controls preload="metadata" src={url} aria-label={`Voice message, ${formatVoiceDuration(durationMs)}`} />
    </div>
  );
}
