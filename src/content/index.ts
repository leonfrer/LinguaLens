import { LINGUALENS_CONFIG } from '../config';
import { t } from '../shared/i18n';
import { getSettings, SETTINGS_KEY } from '../shared/storage';
import { getStoredAppearance } from '../shared/theme';
import {
  extractSentenceContainingText,
  isValidSelectionText,
  normalizeSelectedText
} from '../shared/text';
import type {
  Appearance,
  ExplanationLanguage,
  SaveItemResponse,
  TranslateResponse
} from '../shared/types';
import {
  hidePanel,
  isPanelEventTarget,
  positionPanel,
  refreshPanelAppearance,
  renderPanel,
  setPanelAppearance,
  type PanelState
} from './panel';

let currentState: PanelState | null = null;
let selectionTimer: number | undefined;
let lastRequestedText = '';

function sendRuntimeMessage<TResponse>(message: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage<TResponse>(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? t('runtimeMessageFailed')));
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
          pronunciation: response.pronunciation,
          pronunciationNotation: response.pronunciationNotation,
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
      error: error instanceof Error ? error.message : t('panelTranslationFailed')
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
    pronunciation: currentState.pronunciation,
    pronunciationNotation: currentState.pronunciationNotation,
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
  const { appearance, explanationLanguage, wordLookupEnabled } = await getSettings();
  setPanelAppearance(appearance);

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
    | { appearance?: Appearance; wordLookupEnabled?: boolean }
    | undefined;

  if (changes[SETTINGS_KEY]) {
    setPanelAppearance(getStoredAppearance(nextSettings?.appearance));
  }

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
  }, LINGUALENS_CONFIG.selectionDebounceMs);
}

function startContentScript(): void {
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

  document.addEventListener('mouseup', scheduleSelectionChange);
  document.addEventListener('keyup', scheduleSelectionChange);
  document.addEventListener('selectionchange', scheduleSelectionChange);
  window.addEventListener('scroll', hideCurrentPanel, { passive: true });
  chrome.storage.onChanged.addListener(handleStorageChange);
  colorScheme.addEventListener('change', refreshPanelAppearance);
  void getSettings().then(({ appearance }) => setPanelAppearance(appearance));
}

if (typeof globalThis.document !== 'undefined' && typeof globalThis.window !== 'undefined') {
  startContentScript();
}
