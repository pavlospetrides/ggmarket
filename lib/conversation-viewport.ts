type VisualViewportMetrics = Pick<
  VisualViewport,
  "height" | "width" | "offsetTop" | "offsetLeft"
>;

type ViewportSource = Pick<Window, "innerHeight" | "innerWidth"> & {
  visualViewport?: VisualViewportMetrics | null;
};

export type ConversationViewport = {
  height: number;
  width: number;
  offsetTop: number;
  offsetLeft: number;
};

export function readConversationViewport(source: ViewportSource): ConversationViewport {
  const viewport = source.visualViewport;
  return {
    height: viewport?.height ?? source.innerHeight,
    width: viewport?.width ?? source.innerWidth,
    offsetTop: viewport?.offsetTop ?? 0,
    offsetLeft: viewport?.offsetLeft ?? 0,
  };
}
