import { describe, expect, it } from 'vitest';
import {
  PANEL_FALLBACK_HEIGHT_PX,
  PANEL_FALLBACK_WIDTH_PX,
  PANEL_HORIZONTAL_EDGE_PX,
  PANEL_VIEWPORT_EDGE_PX,
  PANEL_VIEWPORT_GAP_PX,
  computePanelPosition
} from './panel-position';

const baseSelection = {
  top: 100,
  left: 40,
  bottom: 120,
  right: 200,
  width: 160,
  height: 20
};

describe('computePanelPosition', () => {
  it('places the panel below when there is enough space', () => {
    const result = computePanelPosition({
      selection: baseSelection,
      panelWidth: PANEL_FALLBACK_WIDTH_PX,
      panelHeight: PANEL_FALLBACK_HEIGHT_PX,
      viewportWidth: 1000,
      viewportHeight: 800,
      scrollX: 0,
      scrollY: 0
    });

    expect(result.placement).toBe('below');
    expect(result.top).toBe(baseSelection.bottom + PANEL_VIEWPORT_GAP_PX);
    expect(result.left).toBe(baseSelection.left);
  });

  it('places the panel above near the bottom when there is room above', () => {
    const selection = {
      top: 700,
      left: 40,
      bottom: 720,
      right: 200,
      width: 160,
      height: 20
    };

    const result = computePanelPosition({
      selection,
      panelWidth: 320,
      panelHeight: 180,
      viewportWidth: 1000,
      viewportHeight: 800,
      scrollX: 0,
      scrollY: 0
    });

    expect(result.placement).toBe('above');
    expect(result.top).toBe(selection.top - PANEL_VIEWPORT_GAP_PX - 180);
    expect(result.left).toBe(selection.left);
  });

  it('clamps into the viewport when neither side fully fits', () => {
    const selection = {
      top: 300,
      left: 40,
      bottom: 500,
      right: 200,
      width: 160,
      height: 200
    };

    const result = computePanelPosition({
      selection,
      panelWidth: 320,
      panelHeight: 400,
      viewportWidth: 1000,
      viewportHeight: 600,
      scrollX: 0,
      scrollY: 0
    });

    expect(result.top).toBeGreaterThanOrEqual(PANEL_VIEWPORT_EDGE_PX);
    expect(result.top + 400).toBeLessThanOrEqual(600 - PANEL_VIEWPORT_EDGE_PX);
  });

  it('clamps horizontally near the right edge on a narrow viewport', () => {
    const selection = {
      top: 80,
      left: 500,
      bottom: 100,
      right: 620,
      width: 120,
      height: 20
    };

    const result = computePanelPosition({
      selection,
      panelWidth: 320,
      panelHeight: 120,
      viewportWidth: 360,
      viewportHeight: 700,
      scrollX: 0,
      scrollY: 0
    });

    expect(result.left).toBe(360 - 320 - PANEL_HORIZONTAL_EDGE_PX);
    expect(result.left).toBeGreaterThanOrEqual(PANEL_HORIZONTAL_EDGE_PX);
  });

  it('adds scroll offsets into document coordinates', () => {
    const result = computePanelPosition({
      selection: baseSelection,
      panelWidth: 320,
      panelHeight: 120,
      viewportWidth: 1000,
      viewportHeight: 800,
      scrollX: 50,
      scrollY: 200
    });

    expect(result.top).toBe(200 + baseSelection.bottom + PANEL_VIEWPORT_GAP_PX);
    expect(result.left).toBe(50 + baseSelection.left);
  });

  it('uses the provided panel width instead of a hard-coded 332px assumption', () => {
    const selection = {
      top: 80,
      left: 700,
      bottom: 100,
      right: 820,
      width: 120,
      height: 20
    };

    const wide = computePanelPosition({
      selection,
      panelWidth: 320,
      panelHeight: 120,
      viewportWidth: 1000,
      viewportHeight: 800,
      scrollX: 0,
      scrollY: 0
    });
    const narrow = computePanelPosition({
      selection,
      panelWidth: 200,
      panelHeight: 120,
      viewportWidth: 1000,
      viewportHeight: 800,
      scrollX: 0,
      scrollY: 0
    });

    expect(wide.left).toBe(1000 - 320 - PANEL_HORIZONTAL_EDGE_PX);
    expect(narrow.left).toBe(selection.left);
  });
});
