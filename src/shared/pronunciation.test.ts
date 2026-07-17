import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRONUNCIATION_PREFERENCES,
  getEnabledPronunciationPreferences,
  getPronunciationNotationSuggestions,
  normalizePronunciationPreferences
} from './pronunciation';

describe('normalizePronunciationPreferences', () => {
  it('provides concrete notation defaults for common languages', () => {
    expect(normalizePronunciationPreferences(undefined)).toEqual(
      DEFAULT_PRONUNCIATION_PREFERENCES
    );
    expect(DEFAULT_PRONUNCIATION_PREFERENCES.map(({ notationLabel }) => notationLabel)).toEqual([
      'IPA',
      'Kana',
      'Hanyu Pinyin',
      'Hangul'
    ]);
  });

  it('migrates the previous object shape and replaces common Auto values', () => {
    expect(
      normalizePronunciationPreferences({
        English: 'Auto',
        Cantonese: 'Jyutping',
        Icelandic: 'IPA'
      })
    ).toEqual([
      expect.objectContaining({
        languageLabel: 'English',
        notationLabel: 'IPA',
        enabled: true
      }),
      expect.objectContaining({
        languageLabel: 'Cantonese',
        notationLabel: 'Jyutping',
        enabled: true
      }),
      expect.objectContaining({
        languageLabel: 'Icelandic',
        notationLabel: 'IPA',
        enabled: true
      })
    ]);
  });

  it('preserves an intentionally empty preference list', () => {
    expect(normalizePronunciationPreferences([])).toEqual([]);
  });
});

describe('getPronunciationNotationSuggestions', () => {
  it('returns language-specific suggestions without restricting custom input', () => {
    expect(getPronunciationNotationSuggestions(' english ')).toEqual(['IPA', 'KK']);
    expect(getPronunciationNotationSuggestions('Japanese')).toEqual([
      'Kana',
      'Katakana',
      'Romaji'
    ]);
    expect(getPronunciationNotationSuggestions('Cantonese')).toEqual([]);
  });
});

describe('getEnabledPronunciationPreferences', () => {
  it('creates the System Prompt object from enabled rows only', () => {
    expect(
      getEnabledPronunciationPreferences([
        {
          id: 'english',
          languageLabel: 'English',
          notationLabel: 'IPA',
          enabled: true
        },
        {
          id: 'japanese',
          languageLabel: 'Japanese',
          notationLabel: 'Kana',
          enabled: false
        },
        {
          id: 'cantonese',
          languageLabel: 'Cantonese',
          notationLabel: 'Jyutping',
          enabled: true
        }
      ])
    ).toEqual({
      English: 'IPA',
      Cantonese: 'Jyutping'
    });
  });
});
