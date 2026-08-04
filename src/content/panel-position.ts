/** Gap between the selection edge and the panel. */
export const PANEL_VIEWPORT_GAP_PX = 8;
/** Minimum inset from the viewport edges. */
export const PANEL_VIEWPORT_EDGE_PX = 8;
/** Horizontal inset used when clamping left. */
export const PANEL_HORIZONTAL_EDGE_PX = 12;
/** Fallback size before the panel has been laid out. */
export const PANEL_FALLBACK_WIDTH_PX = 320;
export const PANEL_FALLBACK_HEIGHT_PX = 160;

export type ViewportRect = {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
};

export type PanelPositionInput = {
  selection: ViewportRect;
  panelWidth: number;
  panelHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  scrollX: number;
  scrollY: number;
  gap?: number;
  edge?: number;
  horizontalEdge?: number;
};

export type PanelPosition = {
  top: number;
  left: number;
  placement: 'below' | 'above';
};

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

/**
 * Compute document-coordinate top/left for the selection panel.
 * Prefers below the selection; flips above when the viewport lacks room.
 */
export function computePanelPosition(input: PanelPositionInput): PanelPosition {
  const gap = input.gap ?? PANEL_VIEWPORT_GAP_PX;
  const edge = input.edge ?? PANEL_VIEWPORT_EDGE_PX;
  const horizontalEdge = input.horizontalEdge ?? PANEL_HORIZONTAL_EDGE_PX;
  const panelWidth = Math.max(0, input.panelWidth);
  const panelHeight = Math.max(0, input.panelHeight);
  const { selection, viewportWidth, viewportHeight, scrollX, scrollY } = input;

  const spaceBelow = viewportHeight - selection.bottom - gap - edge;
  const spaceAbove = selection.top - gap - edge;
  const fitsBelow = spaceBelow >= panelHeight;
  const fitsAbove = spaceAbove >= panelHeight;

  let placement: 'below' | 'above' = 'below';
  let viewportTop = selection.bottom + gap;

  if (!fitsBelow && fitsAbove) {
    placement = 'above';
    viewportTop = selection.top - gap - panelHeight;
  } else if (!fitsBelow && !fitsAbove) {
    // Prefer the side with more room, then clamp into the viewport.
    if (spaceAbove > spaceBelow) {
      placement = 'above';
      viewportTop = selection.top - gap - panelHeight;
    }
  }

  const maxViewportTop = Math.max(edge, viewportHeight - panelHeight - edge);
  viewportTop = clamp(viewportTop, edge, maxViewportTop);

  const maxViewportLeft = Math.max(
    horizontalEdge,
    viewportWidth - panelWidth - horizontalEdge
  );
  const viewportLeft = clamp(selection.left, horizontalEdge, maxViewportLeft);

  return {
    top: scrollY + viewportTop,
    left: scrollX + viewportLeft,
    placement
  };
}
