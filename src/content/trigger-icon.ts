import { getInterfaceLocale, t } from '../shared/i18n';
import { resolveAppearance } from '../shared/theme';
import type { Appearance } from '../shared/types';

const TRIGGER_ICON_ID = 'lingualens-selection-trigger';/** Hit box / max visual size (hover). Default idle size is scaled down from this. */
const ICON_SIZE_PX = 32;
/** Idle scale relative to ICON_SIZE_PX (hover returns to 1). */
const ICON_IDLE_SCALE = 0.88;
const ICON_HOVER_TRANSITION_MS = 160;
const ICON_GAP_PX = 6;
const VIEWPORT_EDGE_PX = 8;

let triggerHost: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentAppearance: Appearance = 'system';
let onTriggerClick: (() => void) | null = null;

export function setTriggerIconAppearance(appearance: Appearance): void {
  currentAppearance = appearance;
  refreshTriggerIconAppearance();
}

export function refreshTriggerIconAppearance(): void {
  if (!triggerHost) {
    return;
  }

  triggerHost.dataset.theme = resolveAppearance(
    currentAppearance,
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function isTriggerIconEventTarget(target: EventTarget | null): boolean {
  return target instanceof Node && Boolean(triggerHost?.contains(target));
}

export function isTriggerIconVisible(): boolean {
  return Boolean(triggerHost);
}

function ensureTriggerIcon(): ShadowRoot {
  if (shadowRoot) {
    return shadowRoot;
  }

  triggerHost = document.createElement('div');
  triggerHost.id = TRIGGER_ICON_ID;
  triggerHost.style.position = 'absolute';
  triggerHost.style.zIndex = '2147483647';
  triggerHost.style.width = `${ICON_SIZE_PX}px`;
  triggerHost.style.height = `${ICON_SIZE_PX}px`;
  refreshTriggerIconAppearance();
  triggerHost.addEventListener('mousedown', (event) => {
    // Keep the page selection while the user activates the trigger.
    event.preventDefault();
    event.stopPropagation();
  });
  triggerHost.addEventListener('mouseup', (event) => event.stopPropagation());
  triggerHost.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  triggerHost.addEventListener('keyup', (event) => event.stopPropagation());
  shadowRoot = triggerHost.attachShadow({ mode: 'open' });
  document.documentElement.append(triggerHost);
  return shadowRoot;
}

export function hideTriggerIcon(): void {
  triggerHost?.remove();
  triggerHost = null;
  shadowRoot = null;
  onTriggerClick = null;
}

function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

/**
 * Place the icon near the end of the selection, preferring above-right of the range.
 */
export function positionTriggerIcon(selection: Selection): void {
  if (!triggerHost || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  const preferredLeft = rect.right + ICON_GAP_PX;
  const preferredTop = rect.top - ICON_SIZE_PX - ICON_GAP_PX;
  const fallbackTop = rect.bottom + ICON_GAP_PX;

  const maxLeft = Math.max(VIEWPORT_EDGE_PX, viewportWidth - ICON_SIZE_PX - VIEWPORT_EDGE_PX);
  const maxTop = Math.max(VIEWPORT_EDGE_PX, viewportHeight - ICON_SIZE_PX - VIEWPORT_EDGE_PX);

  let viewportLeft = preferredLeft;
  if (viewportLeft > maxLeft) {
    viewportLeft = rect.left - ICON_SIZE_PX - ICON_GAP_PX;
  }
  viewportLeft = clamp(viewportLeft, VIEWPORT_EDGE_PX, maxLeft);

  let viewportTop = preferredTop;
  if (viewportTop < VIEWPORT_EDGE_PX) {
    viewportTop = fallbackTop;
  }
  viewportTop = clamp(viewportTop, VIEWPORT_EDGE_PX, maxTop);

  triggerHost.style.top = `${window.scrollY + viewportTop}px`;
  triggerHost.style.left = `${window.scrollX + viewportLeft}px`;
}

export function showTriggerIcon(selection: Selection, onClick: () => void): void {
  const root = ensureTriggerIcon();
  onTriggerClick = onClick;
  triggerHost?.setAttribute('lang', getInterfaceLocale());

  const iconUrl = chrome.runtime.getURL('icons/icon.svg');

  root.innerHTML = `
    <style>
      :host {
        --trigger-surface: #ffffff;
        --trigger-border: #d8dee8;
        --trigger-shadow: rgba(20, 31, 48, 0.18);
        --trigger-focus: #1769e0;
        color-scheme: light;
      }

      :host([data-theme='dark']) {
        --trigger-surface: #181e29;
        --trigger-border: #3b4659;
        --trigger-shadow: rgba(0, 0, 0, 0.45);
        --trigger-focus: #7795ff;
        color-scheme: dark;
      }

      button {
        align-items: center;
        appearance: none;
        background: transparent;
        border: 0;
        border-radius: 0;
        cursor: pointer;
        display: inline-flex;
        height: ${ICON_SIZE_PX}px;
        justify-content: center;
        margin: 0;
        padding: 0;
        width: ${ICON_SIZE_PX}px;
      }

      button:focus-visible {
        outline: 2px solid var(--trigger-focus);
        outline-offset: 2px;
      }

      img {
        /* Keep the asset's own silhouette (no circular crop). */
        border-radius: 0;
        display: block;
        filter: drop-shadow(0 3px 8px var(--trigger-shadow));
        height: ${ICON_SIZE_PX}px;
        transform: scale(${ICON_IDLE_SCALE});
        transform-origin: center center;
        transition:
          transform ${ICON_HOVER_TRANSITION_MS}ms ease,
          filter ${ICON_HOVER_TRANSITION_MS}ms ease;
        width: ${ICON_SIZE_PX}px;
      }

      button:hover img,
      button:focus-visible img {
        filter: drop-shadow(0 4px 12px var(--trigger-shadow)) brightness(1.04);
        transform: scale(1);
      }

      @media (prefers-reduced-motion: reduce) {
        img {
          transition: none;
        }
      }
    </style>
    <button type="button" aria-label="${t('triggerIconTranslate')}">
      <img alt="" src="${iconUrl}" width="${ICON_SIZE_PX}" height="${ICON_SIZE_PX}" />
    </button>
  `;

  root.querySelector('button')?.addEventListener('click', () => {
    onTriggerClick?.();
  });

  positionTriggerIcon(selection);
}
