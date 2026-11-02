import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  single: vi.fn(),
  insert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getUser: mocks.getUser }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    storage: {
      from: () => ({ upload: mocks.upload, remove: mocks.remove }),
    },
    from: () => ({
      insert: (value: unknown) => {
        mocks.insert(value);
        return { select: () => ({ single: mocks.single }) };
      },
    }),
  })),
}));

const conversationId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const clientId = "33333333-3333-4333-8333-333333333333";
const context = { params: Promise.resolve({ id: conversationId }) };

function request(type = "audio/webm") {
  const form = new FormData();
  form.set("audio", new File([new Uint8Array([1, 2, 3])], "voice.webm", { type }));
  form.set("clientId", clientId);
  form.set("durationMs", "1800");
  return new Request(`https://ggmarket.test/api/conversations/${conversationId}/voice`, { method: "POST", body: form });
}

describe("voice message upload route", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.getUser.mockResolvedValue({ id: userId });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.remove.mockResolvedValue({ error: null });
    mocks.single.mockResolvedValue({ data: { id: "voice-message" }, error: null });
  });

  it("uploads to a conversation/user path and derives the sender from the session", async () => {
    const { POST } = await import("../app/api/conversations/[id]/voice/route");
    const response = await POST(request(), context);
    expect(response.status).toBe(201);
    expect(mocks.upload.mock.calls[0]?.[0]).toMatch(new RegExp(`^${conversationId}/${userId}/[0-9a-f-]+\\.webm$`));
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({
      conversation_id: conversationId,
      sender_id: userId,
      client_id: clientId,
      message_type: "voice",
      attachment_mime: "audio/webm",
      attachment_duration_ms: 1800,
    }));
  });

  it("rejects camera/video data before Storage is called", async () => {
    const { POST } = await import("../app/api/conversations/[id]/voice/route");
    const response = await POST(request("video/webm"), context);
    expect(response.status).toBe(400);
    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it("removes the private object if the message insert fails", async () => {
    mocks.single.mockResolvedValue({ data: null, error: { code: "42501" } });
    const { POST } = await import("../app/api/conversations/[id]/voice/route");
    const response = await POST(request(), context);
    expect(response.status).toBe(403);
    expect(mocks.remove).toHaveBeenCalledOnce();
  });
});
