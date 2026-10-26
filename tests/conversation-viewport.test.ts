import { describe, expect, it } from "vitest";
import { readConversationViewport } from "../lib/conversation-viewport";

describe("readConversationViewport", () => {
  it("uses the visual viewport height and layout-relative origin", () => {
    expect(readConversationViewport({
      innerHeight: 844,
      innerWidth: 390,
      visualViewport: {
        height: 503.5,
        width: 390,
        offsetTop: 287.25,
        offsetLeft: 0,
      },
    })).toEqual({
      height: 503.5,
      width: 390,
      offsetTop: 287.25,
      offsetLeft: 0,
    });
  });

  it("falls back to the layout viewport when VisualViewport is unavailable", () => {
    expect(readConversationViewport({
      innerHeight: 667,
      innerWidth: 375,
      visualViewport: null,
    })).toEqual({
      height: 667,
      width: 375,
      offsetTop: 0,
      offsetLeft: 0,
    });
  });
});
