import type { ContentSettings, ExplanationLanguage } from '../shared/types';

export type PanelStatus = 'loading' | 'ready' | 'saved' | 'error';

export type SelectionLookupDecision =
  | 'hide'
  | 'reposition-panel'
  | 'reposition-trigger'
  | 'show-trigger'
  | 'translate';

export type SelectionLookupInput = {
  hasValidSelection: boolean;
  wordLookupEnabled: boolean;
  instantTranslateOnSelect: boolean;
  text: string;
  explanationLanguage: ExplanationLanguage;
  lastRequestedText: string;
  panelStatus: PanelStatus | null;
  panelExplanationLanguage: ExplanationLanguage | null;
  pendingText: string | null;
  pendingExplanationLanguage: ExplanationLanguage | null;
  triggerVisible: boolean;
};

/**
 * Decide what the content script should do after a settled selection.
 *
 * Duplicate requests are skipped while a non-error panel is already showing the
 * same text, and icon mode reuses a visible trigger instead of recreating it.
 */
export function decideSelectionLookup(input: SelectionLookupInput): SelectionLookupDecision {
  if (!input.hasValidSelection || !input.wordLookupEnabled) {
    return 'hide';
  }

  if (
    input.text === input.lastRequestedText &&
    input.panelStatus !== null &&
    input.panelExplanationLanguage === input.explanationLanguage &&
    input.panelStatus !== 'error'
  ) {
    return 'reposition-panel';
  }

  if (
    !input.instantTranslateOnSelect &&
    input.pendingText === input.text &&
    input.pendingExplanationLanguage === input.explanationLanguage &&
    input.triggerVisible
  ) {
    return 'reposition-trigger';
  }

  return input.instantTranslateOnSelect ? 'translate' : 'show-trigger';
}

export type ContentSettingsEffects = {
  hideAll: boolean;
  hideTrigger: boolean;
  dismissPanel: boolean;
  rescheduleSelection: boolean;
};

/**
 * Side effects to apply after content settings change, once appearance has been
 * written through. Disabled lookup wins over mode switches.
 */
export function contentSettingsEffects(
  previous: Pick<ContentSettings, 'wordLookupEnabled' | 'instantTranslateOnSelect'>,
  next: Pick<ContentSettings, 'wordLookupEnabled' | 'instantTranslateOnSelect'>,
  hasOpenPanel: boolean
): ContentSettingsEffects {
  if (!next.wordLookupEnabled) {
    return {
      hideAll: true,
      hideTrigger: false,
      dismissPanel: false,
      rescheduleSelection: false
    };
  }

  return {
    hideAll: false,
    hideTrigger: next.instantTranslateOnSelect && !previous.instantTranslateOnSelect,
    dismissPanel:
      !next.instantTranslateOnSelect && previous.instantTranslateOnSelect && hasOpenPanel,
    rescheduleSelection: true
  };
}

export function shouldScheduleSelectionChange(
  isSelectingWithPointer: boolean,
  isExtensionUiTarget: boolean
): boolean {
  return !isSelectingWithPointer && !isExtensionUiTarget;
}
