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

export type Settings = {
  wordLookupEnabled: boolean;
  pronunciationLookupEnabled: boolean;
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
