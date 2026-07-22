import { getInterfaceLocale, t } from '../shared/i18n';
import { resolveAppearance } from '../shared/theme';
import type { Appearance, ExplanationLanguage, LlmProvider } from '../shared/types';

const PANEL_ID = 'lingualens-selection-panel';

export type PanelState = {
  text: string;
  translation: string;
  pronunciation?: string;
  pronunciationNotation?: string;
  explanationLanguage: ExplanationLanguage;
  sentenceContext?: string;
  explanation?: string;
  provider?: LlmProvider;
  model?: string;
  status: 'loading' | 'ready' | 'saved' | 'error';
  error?: string;
};

type PanelActions = {
  onClose: () => void;
  onSave: () => void;
};

let panelHost: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentAppearance: Appearance = 'system';

export function setPanelAppearance(appearance: Appearance): void {
  currentAppearance = appearance;
  refreshPanelAppearance();
}

export function refreshPanelAppearance(): void {
  if (!panelHost) {
    return;
  }

  panelHost.dataset.theme = resolveAppearance(
    currentAppearance,
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );
}

export function isPanelEventTarget(target: EventTarget | null): boolean {
  return target instanceof Node && Boolean(panelHost?.contains(target));
}

function ensurePanel(): ShadowRoot {
  if (shadowRoot) {
    return shadowRoot;
  }

  panelHost = document.createElement('div');
  panelHost.id = PANEL_ID;
  panelHost.style.position = 'absolute';
  panelHost.style.zIndex = '2147483647';
  panelHost.style.width = 'min(320px, calc(100vw - 24px))';
  refreshPanelAppearance();
  panelHost.addEventListener('mousedown', (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  panelHost.addEventListener('mouseup', (event) => event.stopPropagation());
  panelHost.addEventListener('click', (event) => event.stopPropagation());
  panelHost.addEventListener('keyup', (event) => event.stopPropagation());
  shadowRoot = panelHost.attachShadow({ mode: 'open' });
  document.documentElement.append(panelHost);
  return shadowRoot;
}

export function hidePanel(): void {
  panelHost?.remove();
  panelHost = null;
  shadowRoot = null;
}

export function positionPanel(selection: Selection): void {
  if (!panelHost || selection.rangeCount === 0) {
    return;
  }

  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  const top = window.scrollY + rect.bottom + 8;
  const left = Math.min(
    window.scrollX + rect.left,
    window.scrollX + document.documentElement.clientWidth - 332
  );

  panelHost.style.top = `${Math.max(window.scrollY + 8, top)}px`;
  panelHost.style.left = `${Math.max(window.scrollX + 12, left)}px`;
}

export function renderPanel(state: PanelState, actions: PanelActions): void {
  const root = ensurePanel();
  panelHost?.setAttribute('lang', getInterfaceLocale());
  const saveDisabled = state.status !== 'ready';
  const statusText =
    state.status === 'loading'
      ? t('panelTranslatingStatus')
      : state.status === 'saved'
        ? t('panelSavedStatus')
        : state.status === 'error'
          ? state.error ?? t('panelTranslationFailed')
          : state.model ?? 'LLM';

  root.innerHTML = `
    <style>
      :host {
        --panel-surface: #ffffff;
        --panel-text: #172033;
        --panel-text-secondary: #526070;
        --panel-text-muted: #687386;
        --panel-border: #d8dee8;
        --panel-border-soft: #edf0f4;
        --panel-hover: #edf0f4;
        --panel-accent-bg: #eef2ff;
        --panel-accent: #4158b8;
        --panel-primary: #1769e0;
        --panel-on-primary: #ffffff;
        --panel-disabled: #c9d2df;
        --panel-danger: #b42318;
        color-scheme: light;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      :host([data-theme='dark']) {
        --panel-surface: #181e29;
        --panel-text: #edf2fa;
        --panel-text-secondary: #c3ccda;
        --panel-text-muted: #a3aec0;
        --panel-border: #3b4659;
        --panel-border-soft: #283140;
        --panel-hover: #252d3b;
        --panel-accent-bg: #252e50;
        --panel-accent: #a8b8ff;
        --panel-primary: #7795ff;
        --panel-on-primary: #10141d;
        --panel-disabled: #4a5568;
        --panel-danger: #ff9b95;
        color-scheme: dark;
      }

      .panel {
        background: var(--panel-surface);
        border: 1px solid var(--panel-border);
        border-radius: 8px;
        box-shadow: 0 12px 32px rgba(20, 31, 48, 0.18);
        color: var(--panel-text);
        overflow: hidden;
      }

      .body {
        display: grid;
        gap: 8px;
        padding: 12px;
      }

      .source {
        color: var(--panel-text-secondary);
        font-size: 12px;
        line-height: 1.45;
        max-height: 54px;
        overflow: hidden;
      }

      .translation {
        font-size: 14px;
        font-weight: 600;
        line-height: 1.45;
        min-height: 20px;
      }

      .pronunciationRow {
        align-items: center;
        color: var(--panel-text-secondary);
        display: flex;
        font-size: 13px;
        gap: 7px;
        line-height: 1.45;
      }

      .pronunciationRow[hidden] {
        display: none;
      }

      .pronunciationNotation {
        background: var(--panel-accent-bg);
        border-radius: 999px;
        color: var(--panel-accent);
        flex: 0 0 auto;
        font-size: 10px;
        font-weight: 700;
        line-height: 1;
        padding: 4px 6px;
      }

      .pronunciationNotation:empty {
        display: none;
      }

      .explanation {
        color: var(--panel-text-muted);
        font-size: 12px;
        line-height: 1.45;
      }

      .explanation[hidden] {
        display: none;
      }

      .actions {
        align-items: flex-start;
        border-top: 1px solid var(--panel-border-soft);
        display: flex;
        gap: 8px;
        justify-content: space-between;
        padding: 8px 10px;
      }

      .actionButtons {
        align-items: center;
        display: flex;
        flex: 0 0 auto;
        gap: 8px;
      }

      .status {
        color: ${state.status === 'error' ? 'var(--panel-danger)' : 'var(--panel-text-muted)'};
        flex: 1 1 auto;
        font-size: 12px;
        line-height: 1.35;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      button {
        appearance: none;
        background: var(--panel-primary);
        border: 0;
        border-radius: 6px;
        color: var(--panel-on-primary);
        cursor: pointer;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        min-height: 30px;
        padding: 0 12px;
        white-space: nowrap;
      }

      button.secondary {
        background: transparent;
        color: var(--panel-text-secondary);
      }

      button.iconButton {
        align-items: center;
        display: inline-flex;
        height: 30px;
        justify-content: center;
        min-height: 30px;
        padding: 0;
        width: 30px;
      }

      button.iconButton svg {
        height: 18px;
        width: 18px;
      }

      button.secondary:hover {
        background: var(--panel-hover);
        color: var(--panel-text);
      }

      button:disabled {
        background: var(--panel-disabled);
        cursor: default;
      }
    </style>
    <section class="panel" role="dialog" aria-label="${t('panelTranslationAriaLabel')}">
      <div class="body">
        <div class="source"></div>
        <div class="pronunciationRow"${state.pronunciation ? '' : ' hidden'}>
          <span class="pronunciationNotation"></span>
          <span class="pronunciation"></span>
        </div>
        <div class="translation"></div>
        <div class="explanation"${state.explanation ? '' : ' hidden'}></div>
      </div>
      <div class="actions">
        <span class="status"></span>
        <div class="actionButtons">
          <button class="secondary iconButton" type="button" data-action="close" aria-label="${t('panelClose')}">
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <path d="M5.25 5.25l9.5 9.5M14.75 5.25l-9.5 9.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"></path>
            </svg>
          </button>
          <button type="button" data-action="save"${saveDisabled ? ' disabled' : ''}>${t('panelSave')}</button>
        </div>
      </div>
    </section>
  `;

  root.querySelector('.source')!.textContent = state.text;
  root.querySelector('.pronunciation')!.textContent = state.pronunciation ?? '';
  root.querySelector('.pronunciationNotation')!.textContent = state.pronunciationNotation ?? '';
  root.querySelector('.translation')!.textContent =
    state.status === 'loading' ? t('panelGeneratingTranslation') : state.translation;
  root.querySelector('.explanation')!.textContent = state.explanation ?? '';
  root.querySelector('.status')!.textContent = statusText;
  root.querySelector('[data-action="close"]')?.addEventListener('click', actions.onClose);
  root.querySelector('[data-action="save"]')?.addEventListener('click', actions.onSave);
}
