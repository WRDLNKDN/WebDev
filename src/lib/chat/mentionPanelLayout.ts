/** Horizontal / vertical gutter from visual viewport edges (px). */
export const MENTION_PANEL_VIEWPORT_GUTTER = 8;

const MAX_PANEL_HEIGHT = 220;
/** Prefer flipping above the anchor when below is tighter than this. */
const FLIP_BELOW_THRESHOLD = 100;
/** Minimum usable panel height when space is very tight. */
const MIN_PANEL_HEIGHT_SOFT = 60;

export type VisualViewportMetrics = {
  width: number;
  height: number;
  offsetTop: number;
  offsetLeft: number;
};

export type MentionPanelLayout = {
  left: number;
  width: number;
  top: number;
  maxHeight: number;
};

export type AnchorRect = Pick<
  DOMRectReadOnly,
  'left' | 'right' | 'top' | 'bottom' | 'width'
>;

/** Snapshot of `window.visualViewport` (or layout viewport fallback). */
export function readVisualViewportMetrics(): VisualViewportMetrics {
  if (typeof window === 'undefined') {
    return {
      width: 400,
      height: 700,
      offsetTop: 0,
      offsetLeft: 0,
    };
  }
  const vv = window.visualViewport;
  if (!vv) {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      offsetTop: 0,
      offsetLeft: 0,
    };
  }
  return {
    width: vv.width,
    height: vv.height,
    offsetTop: vv.offsetTop,
    offsetLeft: vv.offsetLeft,
  };
}

/**
 * Fixed-position coordinates for the @mention panel so it stays inside the
 * *visual* viewport (e.g. above the mobile software keyboard).
 */
export function computeMentionPanelLayout(
  anchor: AnchorRect,
  vp: VisualViewportMetrics,
  minWidth = 280,
): MentionPanelLayout {
  const G = MENTION_PANEL_VIEWPORT_GUTTER;
  const { width: vw, height: vh, offsetTop, offsetLeft } = vp;

  const visibleLeft = offsetLeft;
  const visibleRight = offsetLeft + vw;
  const visibleTop = offsetTop;
  const visibleBottom = offsetTop + vh;

  const width = Math.min(Math.max(minWidth, anchor.width), vw - G * 2);

  const left = Math.max(
    visibleLeft + G,
    Math.min(anchor.left, visibleRight - width - G),
  );

  const preferredBelowTop = anchor.bottom + 4;
  const spaceBelow = visibleBottom - preferredBelowTop - G;
  const spaceAbove = anchor.top - visibleTop - G;

  let top: number;
  let maxHeight: number;

  const flipAbove =
    spaceBelow < FLIP_BELOW_THRESHOLD && spaceAbove > spaceBelow;

  if (flipAbove) {
    maxHeight = Math.min(
      MAX_PANEL_HEIGHT,
      Math.max(MIN_PANEL_HEIGHT_SOFT, spaceAbove - 4),
    );
    top = anchor.top - 4 - maxHeight;
    if (top < visibleTop + G) {
      top = visibleTop + G;
      maxHeight = Math.min(
        MAX_PANEL_HEIGHT,
        Math.max(MIN_PANEL_HEIGHT_SOFT, anchor.top - top - 4),
      );
    }
  } else {
    top = preferredBelowTop;
    maxHeight = Math.min(
      MAX_PANEL_HEIGHT,
      Math.max(MIN_PANEL_HEIGHT_SOFT, spaceBelow),
    );
    const bottomEdge = top + maxHeight;
    if (bottomEdge > visibleBottom - G) {
      maxHeight = Math.max(
        MIN_PANEL_HEIGHT_SOFT,
        Math.min(MAX_PANEL_HEIGHT, visibleBottom - G - top),
      );
    }
  }

  return { left, width, top, maxHeight };
}
