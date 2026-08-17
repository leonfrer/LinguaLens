import { describe, expect, it } from 'vitest';
import {
  contentSettingsEffects,
  decideSelectionLookup,
  shouldScheduleSelectionChange,
  type SelectionLookupInput
} from './selection-lifecycle';

const baseInput: SelectionLookupInput = {
  hasValidSelection: true,
  wordLookupEnabled: true,
  instantTranslateOnSelect: true,
  text: 'hello',
  explanationLanguage: 'zh-CN',
  lastRequestedText: '',
  panelStatus: null,
  panelExplanationLanguage: null,
  pendingText: null,
  pendingExplanationLanguage: null,
  triggerVisible: false
};

describe('decideSelectionLookup', () => {
  it('hides when the selection is empty or invalid', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        hasValidSelection: false,
        lastRequestedText: 'hello',
        panelStatus: 'ready',
        panelExplanationLanguage: 'zh-CN'
      })
    ).toBe('hide');
  });

  it('hides when word lookup is disabled', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        wordLookupEnabled: false
      })
    ).toBe('hide');
  });

  it.each(['loading', 'ready', 'saved'] as const)(
    'repositions the panel for a duplicate %s lookup',
    (panelStatus) => {
      expect(
        decideSelectionLookup({
          ...baseInput,
          lastRequestedText: 'hello',
          panelStatus,
          panelExplanationLanguage: 'zh-CN'
        })
      ).toBe('reposition-panel');
    }
  );

  it('does not treat an error panel as a duplicate lookup', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        lastRequestedText: 'hello',
        panelStatus: 'error',
        panelExplanationLanguage: 'zh-CN'
      })
    ).toBe('translate');
  });

  it('translates again when the explanation language changed', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        lastRequestedText: 'hello',
        panelStatus: 'ready',
        panelExplanationLanguage: 'en'
      })
    ).toBe('translate');
  });

  it('translates a new selection even if a panel is already open', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        text: 'world',
        lastRequestedText: 'hello',
        panelStatus: 'ready',
        panelExplanationLanguage: 'zh-CN'
      })
    ).toBe('translate');
  });

  it('reuses a visible icon-mode trigger for the same pending lookup', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        instantTranslateOnSelect: false,
        pendingText: 'hello',
        pendingExplanationLanguage: 'zh-CN',
        triggerVisible: true
      })
    ).toBe('reposition-trigger');
  });

  it('shows a new trigger when icon mode has no matching pending lookup', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        instantTranslateOnSelect: false,
        pendingText: 'hello',
        pendingExplanationLanguage: 'zh-CN',
        triggerVisible: false
      })
    ).toBe('show-trigger');

    expect(
      decideSelectionLookup({
        ...baseInput,
        instantTranslateOnSelect: false,
        text: 'world',
        pendingText: 'hello',
        pendingExplanationLanguage: 'zh-CN',
        triggerVisible: true
      })
    ).toBe('show-trigger');
  });

  it('ignores a pending trigger while instant translate is on', () => {
    expect(
      decideSelectionLookup({
        ...baseInput,
        pendingText: 'hello',
        pendingExplanationLanguage: 'zh-CN',
        triggerVisible: true
      })
    ).toBe('translate');
  });
});

describe('contentSettingsEffects', () => {
  const enabledInstant = {
    wordLookupEnabled: true,
    instantTranslateOnSelect: true
  };
  const enabledIcon = {
    wordLookupEnabled: true,
    instantTranslateOnSelect: false
  };

  it('hides everything and skips reschedule when lookup is turned off', () => {
    expect(contentSettingsEffects(enabledInstant, {
      wordLookupEnabled: false,
      instantTranslateOnSelect: true
    }, true)).toEqual({
      hideAll: true,
      hideTrigger: false,
      dismissPanel: false,
      rescheduleSelection: false
    });
  });

  it('only reschedules when settings stay in the same lookup mode', () => {
    expect(contentSettingsEffects(enabledInstant, enabledInstant, true)).toEqual({
      hideAll: false,
      hideTrigger: false,
      dismissPanel: false,
      rescheduleSelection: true
    });
  });

  it('drops the waiting icon when switching to instant mode', () => {
    expect(contentSettingsEffects(enabledIcon, enabledInstant, false)).toEqual({
      hideAll: false,
      hideTrigger: true,
      dismissPanel: false,
      rescheduleSelection: true
    });
  });

  it('dismisses an open panel when switching to icon mode', () => {
    expect(contentSettingsEffects(enabledInstant, enabledIcon, true)).toEqual({
      hideAll: false,
      hideTrigger: false,
      dismissPanel: true,
      rescheduleSelection: true
    });
  });

  it('does not dismiss a panel that is not open when switching to icon mode', () => {
    expect(contentSettingsEffects(enabledInstant, enabledIcon, false)).toEqual({
      hideAll: false,
      hideTrigger: false,
      dismissPanel: false,
      rescheduleSelection: true
    });
  });
});

describe('shouldScheduleSelectionChange', () => {
  it('ignores selection events while the pointer is down or the target is extension UI', () => {
    expect(shouldScheduleSelectionChange(true, false)).toBe(false);
    expect(shouldScheduleSelectionChange(false, true)).toBe(false);
    expect(shouldScheduleSelectionChange(true, true)).toBe(false);
  });

  it('schedules after the pointer is released away from the panel and trigger', () => {
    expect(shouldScheduleSelectionChange(false, false)).toBe(true);
  });
});
