import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

describe("native keyboard dictation contract", () => {
  it("keeps chat text-only without requesting website microphone access", () => {
    expect(read("components/chat-interface.tsx")).not.toMatch(/VoiceRecorder|MediaRecorder|voice message/i);
    expect(read("proxy.ts")).toContain("camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  });

  it("does not ship custom audio endpoints, storage, or recorder utilities", () => {
    for (const file of [
      "app/api/conversations/[id]/voice/route.ts",
      "components/voice-message-bubble.tsx",
      "components/voice-recorder.tsx",
      "lib/voice-message.ts",
      "supabase/migrations/202611030001_private_voice_messages.sql",
    ]) {
      expect(fs.existsSync(path.join(process.cwd(), file)), file).toBe(false);
    }
  });
});
