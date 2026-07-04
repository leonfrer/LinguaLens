export type TargetLanguage = 'zh-CN' | 'en';

export type Settings = {
  targetLanguage: TargetLanguage;
};

export type SavedItem = {
  id: string;
  text: string;
  translation: string;
  targetLanguage: TargetLanguage;
  sourceUrl: string;
  sourceTitle: string;
  createdAt: number;
};

export type TranslateRequestMessage = {
  type: 'LINGUALENS_TRANSLATE';
  text: string;
  targetLanguage: TargetLanguage;
};

export type SaveItemMessage = {
  type: 'LINGUALENS_SAVE_ITEM';
  text: string;
  translation: string;
  targetLanguage: TargetLanguage;
  sourceUrl: string;
  sourceTitle: string;
};

export type LinguaLensMessage = TranslateRequestMessage | SaveItemMessage;

export type TranslateResponse =
  | {
      ok: true;
      translation: string;
      provider: 'mock';
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
