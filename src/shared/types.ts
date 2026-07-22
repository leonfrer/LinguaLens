export type ExplanationLanguage =
  | 'zh-CN'
  | 'zh-TW'
  | 'en'
  | 'ja'
  | 'ko'
  | 'fr'
  | 'de'
  | 'es'
  | 'pt'
  | 'it'
  | 'ru'
  | 'ar';

export type LlmProvider = 'openai-compatible';

export type Appearance = 'light' | 'dark' | 'system';

export type InterfaceLanguage = 'system' | 'en' | 'zh-CN' | 'zh-TW';

export type LlmEndpointPreset =
  | 'nvidia'
  | 'openai'
  | 'openrouter'
  | 'groq'
  | 'deepinfra'
  | 'together'
  | 'local'
  | 'ollama'
  | 'custom';

export type PronunciationPreference = {
  id: string;
  languageLabel: string;
  notationLabel: string;
  enabled: boolean;
};

export type PronunciationPreferences = PronunciationPreference[];
export type PronunciationPromptPreferences = Record<string, string>;

export type Settings = {
  appearance: Appearance;
  interfaceLanguage: InterfaceLanguage;
  wordLookupEnabled: boolean;
  pronunciationLookupEnabled: boolean;
  skipLongTextPronunciation: boolean;
  pronunciationPreferences: PronunciationPreferences;
  explanationLanguage: ExplanationLanguage;
  llmProvider: LlmProvider;
  llmEndpointPreset: LlmEndpointPreset;
  baseUrl: string;
  llmModel: string;
  apiKey: string;
};

export type SavedItem = {
  id: string;
  text: string;
  translation: string;
  pronunciation?: string;
  pronunciationNotation?: string;
  explanationLanguage: ExplanationLanguage;
  sentenceContext?: string;
  explanation?: string;
  provider?: LlmProvider;
  model?: string;
  sourceUrl: string;
  sourceTitle: string;
  createdAt: number;
};

export type TranslateRequestMessage = {
  type: 'LINGUALENS_TRANSLATE';
  text: string;
  sentenceContext?: string;
  explanationLanguage: ExplanationLanguage;
};

export type SaveItemMessage = {
  type: 'LINGUALENS_SAVE_ITEM';
  text: string;
  translation: string;
  pronunciation?: string;
  pronunciationNotation?: string;
  explanationLanguage: ExplanationLanguage;
  sentenceContext?: string;
  explanation?: string;
  provider?: LlmProvider;
  model?: string;
  sourceUrl: string;
  sourceTitle: string;
};

export type LinguaLensMessage = TranslateRequestMessage | SaveItemMessage;

export type TranslateResponse =
  | {
      ok: true;
      translation: string;
      pronunciation?: string;
      pronunciationNotation?: string;
      explanation?: string;
      provider: LlmProvider;
      model?: string;
    }
  | {
      ok: false;
      error: string;
    };

export type SaveItemResponse =
  | {
      ok: true;
      item: SavedItem;
    }
  | {
      ok: false;
      error: string;
    };
