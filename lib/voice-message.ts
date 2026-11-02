export const MAX_VOICE_BYTES = 15 * 1024 * 1024;
export const MAX_VOICE_DURATION_MS = 5 * 60 * 1000;

export const VOICE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/ogg;codecs=opus",
  "audio/mp4",
  "audio/webm",
  "audio/ogg",
] as const;

export function baseVoiceMimeType(type: string) {
  return type.toLowerCase().split(";", 1)[0]?.trim() ?? "";
}

export function chooseVoiceMimeType(isSupported: (type: string) => boolean) {
  return VOICE_MIME_TYPES.find(isSupported);
}

export function voiceExtension(type: string) {
  switch (baseVoiceMimeType(type)) {
    case "audio/mp4": return "m4a";
    case "audio/ogg": return "ogg";
    default: return "webm";
  }
}

export function isAllowedVoiceFile(file: { type: string; size: number }) {
  return ["audio/webm", "audio/ogg", "audio/mp4"].includes(baseVoiceMimeType(file.type)) &&
    file.size > 0 && file.size <= MAX_VOICE_BYTES;
}

export function formatVoiceDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, "0")}`;
}
