import type {
  PronunciationPreference,
  PronunciationPreferences,
  PronunciationPromptPreferences
} from './types';

export const MAX_PRONUNCIATION_LABEL_LENGTH = 80;

export const DEFAULT_PRONUNCIATION_PREFERENCES: PronunciationPreferences = [
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
    enabled: true
  },
  {
    id: 'chinese',
    languageLabel: 'Chinese',
    notationLabel: 'Hanyu Pinyin',
    enabled: true
  },
  {
    id: 'korean',
    languageLabel: 'Korean',
    notationLabel: 'Hangul',
    enabled: true
  }
];

const DEFAULT_NOTATIONS_BY_LANGUAGE = new Map(
  DEFAULT_PRONUNCIATION_PREFERENCES.map(({ languageLabel, notationLabel }) => [
    languageLabel.toLowerCase(),
    notationLabel
  ])
);

const NOTATION_SUGGESTIONS_BY_LANGUAGE = new Map<string, readonly string[]>([
  ['english', ['IPA', 'KK']],
  ['japanese', ['Kana', 'Katakana', 'Romaji']],
  ['chinese', ['Hanyu Pinyin', 'Zhuyin']],
  ['korean', ['Hangul', 'Revised Romanization']]
]);

export function createDefaultPronunciationPreferences(): PronunciationPreferences {
  return DEFAULT_PRONUNCIATION_PREFERENCES.map((preference) => ({ ...preference }));
}

export function getPronunciationNotationSuggestions(
  languageLabel: string
): readonly string[] {
  return NOTATION_SUGGESTIONS_BY_LANGUAGE.get(
    languageLabel.trim().toLocaleLowerCase()
  ) ?? [];
}

function normalizePreferenceRows(value: unknown[]): PronunciationPreferences {
  const normalizedPreferences: PronunciationPreferences = [];
  const usedIds = new Set<string>();
  const usedLanguageLabels = new Set<string>();

  value.forEach((rawPreference, index) => {
    if (!rawPreference || typeof rawPreference !== 'object' || Array.isArray(rawPreference)) {
      return;
    }

    const preference = rawPreference as Partial<PronunciationPreference>;
    const languageLabel =
      typeof preference.languageLabel === 'string' ? preference.languageLabel.trim() : '';
    let notationLabel =
      typeof preference.notationLabel === 'string' ? preference.notationLabel.trim() : '';

    if (notationLabel.toLowerCase() === 'auto') {
      notationLabel = DEFAULT_NOTATIONS_BY_LANGUAGE.get(languageLabel.toLowerCase()) ?? '';
    }

    if (
      !languageLabel ||
      !notationLabel ||
      languageLabel.length > MAX_PRONUNCIATION_LABEL_LENGTH ||
      notationLabel.length > MAX_PRONUNCIATION_LABEL_LENGTH
    ) {
      return;
    }

    const normalizedLanguageLabel = languageLabel.toLocaleLowerCase();
    if (usedLanguageLabels.has(normalizedLanguageLabel)) {
      return;
    }

    const requestedId =
      typeof preference.id === 'string' && preference.id.trim()
        ? preference.id.trim()
        : `preference-${index + 1}`;
    let id = requestedId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${requestedId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    usedLanguageLabels.add(normalizedLanguageLabel);
    normalizedPreferences.push({
      id,
      languageLabel,
      notationLabel,
      enabled: preference.enabled !== false
    });
  });

  return normalizedPreferences;
}

export function normalizePronunciationPreferences(
  value: unknown
): PronunciationPreferences {
  if (value === undefined || value === null) {
    return createDefaultPronunciationPreferences();
  }

  if (Array.isArray(value)) {
    return normalizePreferenceRows(value);
  }

  if (typeof value === 'object') {
    return normalizePreferenceRows(
      Object.entries(value).map(([languageLabel, notationLabel], index) => ({
        id: `legacy-preference-${index + 1}`,
        languageLabel,
        notationLabel,
        enabled: true
      }))
    );
  }

  return createDefaultPronunciationPreferences();
}

export function getEnabledPronunciationPreferences(
  preferences: PronunciationPreferences
): PronunciationPromptPreferences {
  return Object.fromEntries(
    preferences
      .filter(
        ({ enabled, languageLabel, notationLabel }) =>
          enabled && languageLabel.trim() && notationLabel.trim()
      )
      .map(({ languageLabel, notationLabel }) => [
        languageLabel.trim(),
        notationLabel.trim()
      ])
  );
}
