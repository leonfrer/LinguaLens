import { getSettings } from '../shared/storage';
import { isValidSelectionText, normalizeSelectedText } from '../shared/text';
import type { SaveItemResponse, TargetLanguage, TranslateResponse } from '../shared/types';

const PANEL_ID = 'lingualens-selection-panel';

type PanelState = {
  text: string;
  translation: string;
  targetLanguage: TargetLanguage;
  status: 'loading' | 'ready' | 'saved' | 'error';
  error?: string;
};

let panelHost: HTMLDivElement | null = null;
let shadowRoot: ShadowRoot | null = null;
let currentState: PanelState | null = null;
let selectionTimer: number | undefined;
let lastRequestedText = '';

function sendRuntimeMessage<TResponse>(message: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage<TResponse>(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? 'Extension message failed'));
        return;
      }

      resolve(response);
    });
  });
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

function hidePanel(): void {
  panelHost?.remove();
  panelHost = null;
  shadowRoot = null;
  currentState = null;
  lastRequestedText = '';
}

function positionPanel(selection: Selection): void {
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

function renderPanel(state: PanelState): void {
  const root = ensurePanel();
  const saveDisabled = state.status !== 'ready';
  const statusText =
    state.status === 'loading'
      ? '翻译中...'
      : state.status === 'saved'
        ? '已保存'
        : state.status === 'error'
          ? state.error ?? '翻译失败'
          : 'MVP mock';

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
        align-items: center;
        border-top: 1px solid #edf0f4;
        display: flex;
        gap: 8px;
        justify-content: space-between;
        padding: 8px 10px;
      }

      .status {
        color: ${state.status === 'error' ? '#b42318' : '#687386'};
        font-size: 12px;
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
      }

      button.secondary {
        background: transparent;
        color: #526070;
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
        <div>
          <button class="secondary" type="button" data-action="close" aria-label="关闭">x</button>
          <button type="button" data-action="save"${saveDisabled ? ' disabled' : ''}>保存</button>
        </div>
      </div>
    </section>
  `;

  root.querySelector('.source')!.textContent = state.text;
  root.querySelector('.translation')!.textContent =
    state.status === 'loading' ? '正在生成模拟翻译' : state.translation;
  root.querySelector('.status')!.textContent = statusText;
  root.querySelector('[data-action="close"]')?.addEventListener('click', hidePanel);
  root.querySelector('[data-action="save"]')?.addEventListener('click', () => {
    void saveCurrentSelection();
  });
}

async function translateSelection(text: string, targetLanguage: TargetLanguage): Promise<void> {
  const requestedText = text;
  lastRequestedText = requestedText;

  currentState = {
    text,
    translation: '',
    targetLanguage,
    status: 'loading'
  };
  renderPanel(currentState);

  try {
    const response = await sendRuntimeMessage<TranslateResponse>({
      type: 'LINGUALENS_TRANSLATE',
      text,
      targetLanguage
    });

    if (lastRequestedText !== requestedText) {
      return;
    }

    currentState = response.ok
      ? {
          text,
          translation: response.translation,
          targetLanguage,
          status: 'ready'
        }
      : {
          text,
          translation: '',
          targetLanguage,
          status: 'error',
          error: response.error
        };
  } catch (error) {
    currentState = {
      text,
      translation: '',
      targetLanguage,
      status: 'error',
      error: error instanceof Error ? error.message : '翻译失败'
    };
  }

  renderPanel(currentState);
}

async function saveCurrentSelection(): Promise<void> {
  if (!currentState || currentState.status !== 'ready') {
    return;
  }

  const response = await sendRuntimeMessage<SaveItemResponse>({
    type: 'LINGUALENS_SAVE_ITEM',
    text: currentState.text,
    translation: currentState.translation,
    targetLanguage: currentState.targetLanguage,
    sourceUrl: window.location.href,
    sourceTitle: document.title
  });

  currentState = response.ok
    ? { ...currentState, status: 'saved' }
    : { ...currentState, status: 'error', error: response.error };
  renderPanel(currentState);
}

async function handleSelectionChange(): Promise<void> {
  const selection = window.getSelection();
  const text = normalizeSelectedText(selection?.toString() ?? '');

  if (!selection || !isValidSelectionText(text)) {
    hidePanel();
    return;
  }

  ensurePanel();
  positionPanel(selection);
  const { targetLanguage } = await getSettings();
  await translateSelection(text, targetLanguage);
}

function scheduleSelectionChange(event?: Event): void {
  if (event?.target instanceof Node && panelHost?.contains(event.target)) {
    return;
  }

  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(() => {
    void handleSelectionChange();
  }, 160);
}

function startContentScript(): void {
  document.addEventListener('mouseup', scheduleSelectionChange);
  document.addEventListener('keyup', scheduleSelectionChange);
  document.addEventListener('selectionchange', scheduleSelectionChange);
  window.addEventListener('scroll', hidePanel, { passive: true });
}

if (typeof globalThis.document !== 'undefined' && typeof globalThis.window !== 'undefined') {
  startContentScript();
}
