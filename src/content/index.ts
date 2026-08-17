import { LINGUALENS_CONFIG } from '../config';
import { t } from '../shared/i18n';
import { applyInterfaceLanguage } from '../shared/localization';
import { CONTENT_SETTINGS_KEY, DEFAULT_CONTENT_SETTINGS } from '../shared/storage';
import { isValidSelectionText, normalizeSelectedText } from '../shared/text';
import type {
  ContentSettings,
  ContentSettingsResponse,
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
import { getSentenceContextFromSelection } from './selection-context';
import {
  contentSettingsEffects,
  decideSelectionLookup,
  shouldScheduleSelectionChange
} from './selection-lifecycle';
import {
  hideTriggerIcon,
  isTriggerIconEventTarget,
  isTriggerIconVisible,
  positionTriggerIcon,
  refreshTriggerIconAppearance,
  setTriggerIconAppearance,
  showTriggerIcon
} from './trigger-icon';

type PendingLookup = {
  text: string;
  explanationLanguage: ExplanationLanguage;
  sentenceContext?: string;
  selectionStartInContext?: number;
};

let currentState: PanelState | null = null;
let pendingLookup: PendingLookup | null = null;
let selectionTimer: number | undefined;
let lastRequestedText = '';
let contentSettings = DEFAULT_CONTENT_SETTINGS;
let contentSettingsReady: Promise<void> = Promise.resolve();
/** True while the primary pointer button is held — suppress lookups mid-drag. */
let isSelectingWithPointer = false;

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

function isLingualensUiEventTarget(target: EventTarget | null): boolean {
  return isPanelEventTarget(target) || isTriggerIconEventTarget(target);
}

function hidePendingTrigger(): void {
  hideTriggerIcon();
  pendingLookup = null;
}

function hideCurrentPanel(): void {
  hidePanel();
  currentState = null;
  lastRequestedText = '';
  hidePendingTrigger();
}

function applyContentSettings(settings: ContentSettings): void {
  const previous = contentSettings;
  contentSettings = settings;
  applyInterfaceLanguage(settings.interfaceLanguage);
  setPanelAppearance(settings.appearance);
  setTriggerIconAppearance(settings.appearance);
  renderCurrentPanel();

  const effects = contentSettingsEffects(previous, settings, currentState !== null);

  if (effects.hideAll) {
    hideCurrentPanel();
    return;
  }

  // Instant mode no longer needs a waiting icon.
  if (effects.hideTrigger) {
    hidePendingTrigger();
  }

  // Icon mode: dismiss an open panel so the next selection shows the icon path.
  if (effects.dismissPanel) {
    hidePanel();
    currentState = null;
    lastRequestedText = '';
  }

  if (effects.rescheduleSelection) {
    scheduleSelectionChange();
  }
}

async function initializeContentSettings(): Promise<void> {
  const response = await sendRuntimeMessage<ContentSettingsResponse>({
    type: 'LINGUALENS_GET_CONTENT_SETTINGS'
  });

  if (!response.ok) {
    throw new Error(response.error);
  }

  applyContentSettings(response.settings);
}

async function translateSelection(
  text: string,
  explanationLanguage: ExplanationLanguage,
  sentenceContext?: string,
  selectionStartInContext?: number
): Promise<void> {
  const requestedText = text;
  lastRequestedText = requestedText;
  hidePendingTrigger();

  currentState = {
    text,
    translation: '',
    explanationLanguage,
    sentenceContext,
    selectionStartInContext,
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
          selectionStartInContext,
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
          selectionStartInContext,
          status: 'error',
          error: response.error
        };
  } catch (error) {
    currentState = {
      text,
      translation: '',
      explanationLanguage,
      sentenceContext,
      selectionStartInContext,
      status: 'error',
      error: error instanceof Error ? error.message : t('panelTranslationFailed')
    };
  }

  renderCurrentPanel();
}

function showSelectionTrigger(
  selection: Selection,
  lookup: PendingLookup
): void {
  pendingLookup = lookup;
  // Drop any prior panel so only the icon is visible before the user confirms.
  hidePanel();
  currentState = null;
  lastRequestedText = '';

  showTriggerIcon(selection, () => {
    const active = pendingLookup;
    if (!active) {
      return;
    }

    void translateSelection(
      active.text,
      active.explanationLanguage,
      active.sentenceContext,
      active.selectionStartInContext
    );

    const currentSelection = window.getSelection();
    if (currentSelection && currentSelection.rangeCount > 0) {
      // Panel is created in loading state; pin it to the still-active selection.
      positionPanel(currentSelection);
    }
  });
}

function repositionOpenUi(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    return;
  }

  if (currentState) {
    positionPanel(selection);
  }

  if (isTriggerIconVisible()) {
    positionTriggerIcon(selection);
  }
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

  // Height changes across loading → ready/error/saved; remeasure after layout.
  window.requestAnimationFrame(() => {
    repositionOpenUi();
  });
}

function handleViewportResize(): void {
  repositionOpenUi();
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
    selectionStartInContext: currentState.selectionStartInContext,
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
  try {
    await contentSettingsReady;
  } catch {
    hideCurrentPanel();
    return;
  }

  const selection = window.getSelection();
  const text = normalizeSelectedText(selection?.toString() ?? '');
  const hasValidSelection = Boolean(selection && isValidSelectionText(text));
  const { explanationLanguage, wordLookupEnabled, instantTranslateOnSelect } = contentSettings;
  const decision = decideSelectionLookup({
    hasValidSelection,
    wordLookupEnabled,
    instantTranslateOnSelect,
    text,
    explanationLanguage,
    lastRequestedText,
    panelStatus: currentState?.status ?? null,
    panelExplanationLanguage: currentState?.explanationLanguage ?? null,
    pendingText: pendingLookup?.text ?? null,
    pendingExplanationLanguage: pendingLookup?.explanationLanguage ?? null,
    triggerVisible: isTriggerIconVisible()
  });

  if (decision === 'hide' || !selection) {
    hideCurrentPanel();
    return;
  }

  // Some pages keep the selection when the user clicks elsewhere. mouseup /
  // selectionchange still fire, so skip a duplicate request for the same text
  // while a non-error result (or in-flight request) is already shown.
  if (decision === 'reposition-panel') {
    positionPanel(selection);
    return;
  }

  if (decision === 'reposition-trigger') {
    positionTriggerIcon(selection);
    return;
  }

  const extractedContext = getSentenceContextFromSelection(selection, text);
  const lookup: PendingLookup = {
    text,
    explanationLanguage,
    sentenceContext: extractedContext?.context,
    selectionStartInContext: extractedContext?.selectionStart
  };

  if (decision === 'show-trigger') {
    showSelectionTrigger(selection, lookup);
    return;
  }

  const translationPromise = translateSelection(
    lookup.text,
    lookup.explanationLanguage,
    lookup.sentenceContext,
    lookup.selectionStartInContext
  );
  positionPanel(selection);
  await translationPromise;
}

function handleStorageChange(
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
): void {
  if (areaName !== 'session' || !changes[CONTENT_SETTINGS_KEY]?.newValue) {
    return;
  }

  applyContentSettings(changes[CONTENT_SETTINGS_KEY].newValue as ContentSettings);
}

function cancelScheduledSelectionChange(): void {
  window.clearTimeout(selectionTimer);
  selectionTimer = undefined;
}

function scheduleSelectionChange(event?: Event): void {
  if (
    !shouldScheduleSelectionChange(
      isSelectingWithPointer,
      isLingualensUiEventTarget(event?.target ?? null)
    )
  ) {
    return;
  }

  window.clearTimeout(selectionTimer);
  selectionTimer = window.setTimeout(() => {
    void handleSelectionChange();
  }, LINGUALENS_CONFIG.selectionDebounceMs);
}

function handlePointerSelectionStart(event: MouseEvent): void {
  if (event.button !== 0 || isLingualensUiEventTarget(event.target)) {
    return;
  }

  // Selection is still in progress; never translate until the button is released.
  isSelectingWithPointer = true;
  cancelScheduledSelectionChange();
}

function handlePointerSelectionEnd(event: MouseEvent): void {
  if (event.button !== 0) {
    return;
  }

  isSelectingWithPointer = false;
  scheduleSelectionChange(event);
}

function handleWindowBlur(): void {
  // mouseup may never arrive if the button is released outside the window.
  isSelectingWithPointer = false;
}

function startContentScript(): void {
  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');
  contentSettingsReady = initializeContentSettings();

  // Capture phase so we see the drag start even if a page stops propagation.
  window.addEventListener('mousedown', handlePointerSelectionStart, true);
  window.addEventListener('mouseup', handlePointerSelectionEnd, true);
  window.addEventListener('blur', handleWindowBlur);
  document.addEventListener('keyup', scheduleSelectionChange);
  // Fires continuously while dragging; ignored until the pointer is released.
  document.addEventListener('selectionchange', () => {
    scheduleSelectionChange();
  });
  // Keep the absolute-positioned panel on window scroll; only remeasure on resize.
  window.addEventListener('resize', handleViewportResize);
  chrome.storage.onChanged.addListener(handleStorageChange);
  colorScheme.addEventListener('change', () => {
    refreshPanelAppearance();
    refreshTriggerIconAppearance();
  });
  void contentSettingsReady.catch(() => undefined);
}

if (typeof globalThis.document !== 'undefined' && typeof globalThis.window !== 'undefined') {
  startContentScript();
}
