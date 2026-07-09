import { getSettings, SETTINGS_KEY } from '../shared/storage';
import {
  extractSentenceContainingText,
  isValidSelectionText,
  normalizeSelectedText
} from '../shared/text';
import type { ExplanationLanguage, SaveItemResponse, TranslateResponse } from '../shared/types';
import {
  hidePanel,
  isPanelEventTarget,
  positionPanel,
  renderPanel,
  type PanelState
} from './panel';

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

function hideCurrentPanel(): void {
  hidePanel();
  currentState = null;
  lastRequestedText = '';
}

async function translateSelection(
  text: string,
  explanationLanguage: ExplanationLanguage,
  sentenceContext?: string
): Promise<void> {
  const requestedText = text;
  lastRequestedText = requestedText;

  currentState = {
    text,
    translation: '',
    explanationLanguage,
    sentenceContext,
    status: 'loading'
  };
  renderCurrentPanel();

  try {
    const response = await sendRuntimeMessage<TranslateResponse>({
      type: 'LINGUALENS_TRANSLATE',
      text,
      sentenceContext,
      explanationLanguage
    });

    if (lastRequestedText !== requestedText) {
      return;
    }

    currentState = response.ok
      ? {
          text,
          translation: response.translation,
          explanationLanguage,
          sentenceContext,
          explanation: response.explanation,
          provider: response.provider,
          model: response.model,
          status: 'ready'
        }
      : {
          text,
          translation: '',
          explanationLanguage,
          sentenceContext,
          status: 'error',
          error: response.error
        };
  } catch (error) {
    currentState = {
      text,
      translation: '',
      explanationLanguage,
      sentenceContext,
      status: 'error',
      error: error instanceof Error ? error.message : '翻译失败'
    };
  }

  renderCurrentPanel();
}

function renderCurrentPanel(): void {
  if (!currentState) {
    return;
  }

  renderPanel(currentState, {
    onClose: hideCurrentPanel,
    onSave: () => {
      void saveCurrentSelection();
    }
  });
}

async function saveCurrentSelection(): Promise<void> {
  if (!currentState || currentState.status !== 'ready') {
    return;
  }

  const response = await sendRuntimeMessage<SaveItemResponse>({
    type: 'LINGUALENS_SAVE_ITEM',
    text: currentState.text,
    translation: currentState.translation,
    explanationLanguage: currentState.explanationLanguage,
    sentenceContext: currentState.sentenceContext,
    explanation: currentState.explanation,
    provider: currentState.provider,
    model: currentState.model,
    sourceUrl: window.location.href,
    sourceTitle: document.title
  });

  currentState = response.ok
    ? { ...currentState, status: 'saved' }
    : { ...currentState, status: 'error', error: response.error };
  renderCurrentPanel();
}

async function handleSelectionChange(): Promise<void> {
  const selection = window.getSelection();
  const text = normalizeSelectedText(selection?.toString() ?? '');

  if (!selection || !isValidSelectionText(text)) {
    hideCurrentPanel();
    return;
  }

  const sentenceContext =
    extractSentenceContainingText(selection.anchorNode?.textContent ?? '', text) || undefined;
  const { explanationLanguage, wordLookupEnabled } = await getSettings();

  if (!wordLookupEnabled) {
    hideCurrentPanel();
    return;
  }

  const translationPromise = translateSelection(text, explanationLanguage, sentenceContext);
  positionPanel(selection);
  await translationPromise;
}

function handleStorageChange(changes: Record<string, chrome.storage.StorageChange>): void {
  const nextSettings = changes[SETTINGS_KEY]?.newValue as
    | { wordLookupEnabled?: boolean }
    | undefined;

  if (nextSettings?.wordLookupEnabled === false) {
    hideCurrentPanel();
  }
}

function scheduleSelectionChange(event?: Event): void {
  if (isPanelEventTarget(event?.target ?? null)) {
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
  window.addEventListener('scroll', hideCurrentPanel, { passive: true });
  chrome.storage.onChanged.addListener(handleStorageChange);
}

if (typeof globalThis.document !== 'undefined' && typeof globalThis.window !== 'undefined') {
  startContentScript();
}
