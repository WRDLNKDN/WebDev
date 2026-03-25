import { describe, expect, it } from 'vitest';
import {
  computeMentionPanelLayout,
  readVisualViewportMetrics,
  MENTION_PANEL_VIEWPORT_GUTTER,
} from '../../lib/chat/mentionPanelLayout';

const anchor = (
  partial: Partial<DOMRectReadOnly> & { left: number; top: number },
) =>
  ({
    left: partial.left,
    right: partial.right ?? partial.left + (partial.width ?? 200),
    top: partial.top,
    bottom: partial.bottom ?? partial.top + (partial.height ?? 40),
    width: partial.width ?? 200,
  }) as const;

describe('computeMentionPanelLayout', () => {
  it('places panel below the anchor with capped height when space is ample', () => {
    const vp = { width: 400, height: 800, offsetTop: 0, offsetLeft: 0 };
    const a = anchor({ left: 20, top: 300, bottom: 340, width: 280 });
    const L = computeMentionPanelLayout(a, vp);
    expect(L.top).toBe(344);
    expect(L.maxHeight).toBe(220);
    expect(L.left).toBeGreaterThanOrEqual(MENTION_PANEL_VIEWPORT_GUTTER);
  });

  it('flips above the anchor when space below is tight (keyboard)', () => {
    const vp = { width: 400, height: 280, offsetTop: 420, offsetLeft: 0 };
    /* Anchor sits just above the visual bottom — little room below (keyboard). */
    const a = anchor({ left: 16, top: 640, bottom: 680, width: 300 });
    const visibleBottom = vp.offsetTop + vp.height;
    expect(visibleBottom).toBe(700);
    const spaceBelow =
      visibleBottom - (a.bottom + 4) - MENTION_PANEL_VIEWPORT_GUTTER;
    expect(spaceBelow).toBeLessThan(100);
    const L = computeMentionPanelLayout(a, vp);
    expect(L.top + L.maxHeight).toBeLessThanOrEqual(a.top - 4 + 0.5);
    expect(L.top).toBeGreaterThanOrEqual(
      vp.offsetTop + MENTION_PANEL_VIEWPORT_GUTTER,
    );
  });

  it('clamps horizontal position inside the visual viewport', () => {
    const vp = { width: 360, height: 600, offsetTop: 0, offsetLeft: 0 };
    const a = anchor({ left: 320, top: 200, bottom: 240, width: 280 });
    const L = computeMentionPanelLayout(a, vp, 280);
    expect(L.left + L.width).toBeLessThanOrEqual(
      vp.width - MENTION_PANEL_VIEWPORT_GUTTER,
    );
  });
});

describe('readVisualViewportMetrics', () => {
  it('returns finite numbers in jsdom', () => {
    const m = readVisualViewportMetrics();
    expect(Number.isFinite(m.width)).toBe(true);
    expect(Number.isFinite(m.height)).toBe(true);
  });
});
