import type { ExplanationLanguage, LlmProvider } from '../shared/types';

const PANEL_ID = 'lingualens-selection-panel';

export type PanelState = {
  text: string;
  translation: string;
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
  const saveDisabled = state.status !== 'ready';
  const statusText =
    state.status === 'loading'
      ? '翻译中...'
      : state.status === 'saved'
        ? '已保存'
        : state.status === 'error'
          ? state.error ?? '翻译失败'
          : state.model ?? 'LLM';

  root.innerHTML = `
    <style>
      :host {
        color-scheme: light;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      .panel {
        background: #ffffff;
        border: 1px solid #d8dee8;
        border-radius: 8px;
        box-shadow: 0 12px 32px rgba(20, 31, 48, 0.18);
        color: #172033;
        overflow: hidden;
      }

      .body {
        display: grid;
        gap: 8px;
        padding: 12px;
      }

      .source {
        color: #526070;
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

      .actions {
        align-items: flex-start;
        border-top: 1px solid #edf0f4;
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
        color: ${state.status === 'error' ? '#b42318' : '#687386'};
        flex: 1 1 auto;
        font-size: 12px;
        line-height: 1.35;
        min-width: 0;
        overflow-wrap: anywhere;
      }

      button {
        appearance: none;
        background: #1769e0;
        border: 0;
        border-radius: 6px;
        color: #ffffff;
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
        color: #526070;
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
        background: #edf0f4;
        color: #172033;
      }

      button:disabled {
        background: #c9d2df;
        cursor: default;
      }
    </style>
    <section class="panel" role="dialog" aria-label="LinguaLens translation">
      <div class="body">
        <div class="source"></div>
        <div class="translation"></div>
      </div>
      <div class="actions">
        <span class="status"></span>
        <div class="actionButtons">
          <button class="secondary iconButton" type="button" data-action="close" aria-label="关闭">
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <path d="M5.25 5.25l9.5 9.5M14.75 5.25l-9.5 9.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"></path>
            </svg>
          </button>
          <button type="button" data-action="save"${saveDisabled ? ' disabled' : ''}>保存</button>
        </div>
      </div>
    </section>
  `;

  root.querySelector('.source')!.textContent = state.text;
  root.querySelector('.translation')!.textContent =
    state.status === 'loading' ? '正在生成翻译' : state.translation;
  root.querySelector('.status')!.textContent = statusText;
  root.querySelector('[data-action="close"]')?.addEventListener('click', actions.onClose);
  root.querySelector('[data-action="save"]')?.addEventListener('click', actions.onSave);
}
