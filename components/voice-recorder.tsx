"use client";

import { Mic, Send, Square, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_VOICE_DURATION_MS, chooseVoiceMimeType, formatVoiceDuration } from "@/lib/voice-message";
import { Loader2 } from "./ui/loader-2";

type RecordingPreview = { blob: Blob; url: string; durationMs: number };

export function VoiceRecorder({
  disabled,
  onUpload,
}: {
  disabled: boolean;
  onUpload: (recording: Blob, durationMs: number) => Promise<void>;
}) {
  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [preview, setPreview] = useState<RecordingPreview | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const startingRef = useRef(false);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const cancelRef = useRef(false);
  const previewRef = useRef<RecordingPreview | null>(null);
  const mountedRef = useRef(true);

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);
  const discard = useCallback(() => {
    const current = previewRef.current;
    if (current) URL.revokeObjectURL(current.url);
    previewRef.current = null;
    setPreview(null);
    setElapsedMs(0);
    setError("");
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= MAX_VOICE_DURATION_MS && recorderRef.current?.state === "recording") recorderRef.current.stop();
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cancelRef.current = true;
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      releaseStream();
      const current = previewRef.current;
      if (current) URL.revokeObjectURL(current.url);
    };
  }, [releaseStream]);

  async function start() {
    if (disabled || recording || startingRef.current || uploading) return;
    startingRef.current = true;
    setStarting(true);
    discard();
    setError("");
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported by this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const mimeType = chooseVoiceMimeType((type) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];
      cancelRef.current = false;
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onerror = () => {
        if (mountedRef.current) {
          setError("Recording failed. Check microphone access and try again.");
          setRecording(false);
        }
        releaseStream();
      };
      recorder.onstop = () => {
        const durationMs = Math.min(MAX_VOICE_DURATION_MS, Math.max(250, Date.now() - startedAtRef.current));
        if (mountedRef.current) setRecording(false);
        releaseStream();
        recorderRef.current = null;
        if (cancelRef.current || !mountedRef.current) {
          chunksRef.current = [];
          setElapsedMs(0);
          return;
        }
        const type = recorder.mimeType || chunksRef.current[0]?.type;
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (!blob.size) {
          setError("No audio was recorded. Try again.");
          return;
        }
        const next = { blob, durationMs, url: URL.createObjectURL(blob) };
        previewRef.current = next;
        setPreview(next);
        setElapsedMs(durationMs);
      };
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      recorder.start(250);
      setRecording(true);
    } catch (reason) {
      releaseStream();
      setError(reason instanceof DOMException && reason.name === "NotAllowedError"
        ? "Microphone access was denied. Allow it in browser settings to record."
        : "The microphone could not be started.");
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setStarting(false);
    }
  }

  function stop(cancel = false) {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    cancelRef.current = cancel;
    recorder.stop();
  }

  async function upload() {
    if (!preview || uploading || disabled) return;
    setUploading(true);
    setError("");
    try {
      await onUpload(preview.blob, preview.durationMs);
      if (mountedRef.current) discard();
      else URL.revokeObjectURL(preview.url);
    } catch (reason) {
      if (mountedRef.current) setError(reason instanceof Error ? reason.message : "Voice message could not be sent.");
    } finally {
      if (mountedRef.current) setUploading(false);
    }
  }

  if (recording) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-[#6d527e] bg-[#21172b] px-2" role="status" aria-live="polite" data-recording-state="recording">
        <span className="size-2 animate-pulse rounded-full bg-[#ff6b7c] motion-reduce:animate-none" aria-hidden="true" />
        <span className="min-w-0 flex-1 truncate text-xs">Recording {formatVoiceDuration(elapsedMs)}</span>
        <button type="button" className="icon-btn size-9" onClick={() => stop(true)} aria-label="Cancel voice recording"><X className="size-4" /></button>
        <button type="button" className="icon-btn size-9 bg-[var(--primary)]" onClick={() => stop()} aria-label="Stop voice recording"><Square className="size-4 fill-current" /></button>
      </div>
    );
  }
  if (preview) {
    return (
      <div className="min-w-0 flex-1" data-recording-state={uploading ? "uploading" : "preview"}>
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-2">
          <audio className="h-9 min-w-0 flex-1" controls preload="metadata" src={preview.url} aria-label="Voice recording preview" />
          <button type="button" className="icon-btn size-9" onClick={discard} disabled={uploading} aria-label="Discard voice recording"><Trash2 className="size-4" /></button>
          <button type="button" className="icon-btn size-9 bg-[var(--primary)]" onClick={() => void upload()} disabled={uploading || disabled} aria-label="Send voice recording">
            {uploading ? <Loader2 size="compact" label="Uploading voice message" /> : <Send className="size-4" />}
          </button>
        </div>
        {error ? <p className="mt-1 text-xs text-[var(--danger)]" role="alert">{error}</p> : null}
      </div>
    );
  }
  return (
    <div className="relative shrink-0">
      <button type="button" className="icon-btn size-11 rounded-full bg-[var(--surface-elevated)]" onClick={() => void start()} disabled={disabled || starting} aria-label="Record voice message">
        {starting ? <Loader2 size="compact" delayed label="Starting microphone" /> : <Mic className="size-5" aria-hidden="true" />}
      </button>
      {error ? <p className="absolute bottom-[calc(100%+.5rem)] right-0 z-20 w-64 rounded-xl border border-[#5d2931] bg-[#29151a] p-2 text-xs text-[#ffabb4]" role="alert">{error}</p> : null}
    </div>
  );
}
