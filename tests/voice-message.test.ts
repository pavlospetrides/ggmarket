import { describe, expect, it } from "vitest";
import {
  MAX_VOICE_BYTES,
  chooseVoiceMimeType,
  isAllowedVoiceFile,
  voiceExtension,
} from "../lib/voice-message";

describe("voice message media constraints", () => {
  it("prefers Opus WebM and falls back to Safari-compatible MP4", () => {
    expect(chooseVoiceMimeType((type) => type === "audio/webm;codecs=opus")).toBe("audio/webm;codecs=opus");
    expect(chooseVoiceMimeType((type) => type === "audio/mp4")).toBe("audio/mp4");
    expect(chooseVoiceMimeType(() => false)).toBeUndefined();
  });

  it("maps supported MIME types to safe extensions", () => {
    expect(voiceExtension("audio/webm;codecs=opus")).toBe("webm");
    expect(voiceExtension("audio/mp4")).toBe("m4a");
    expect(voiceExtension("audio/ogg;codecs=opus")).toBe("ogg");
  });

  it("accepts only bounded audio recordings", () => {
    expect(isAllowedVoiceFile({ type: "audio/mp4", size: 1024 })).toBe(true);
    expect(isAllowedVoiceFile({ type: "audio/webm;codecs=opus", size: MAX_VOICE_BYTES })).toBe(true);
    expect(isAllowedVoiceFile({ type: "video/webm", size: 1024 })).toBe(false);
    expect(isAllowedVoiceFile({ type: "audio/mpeg", size: MAX_VOICE_BYTES + 1 })).toBe(false);
    expect(isAllowedVoiceFile({ type: "audio/ogg", size: 0 })).toBe(false);
  });
});
