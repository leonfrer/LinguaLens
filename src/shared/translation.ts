import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import { generateText } from 'ai';
import type { ExplanationLanguage, LlmProvider, Settings, TranslateResponse } from './types';

const dictionary: Record<string, string> = {
  hello: '你好',
  world: '世界',
  language: '语言',
  reading: '阅读',
  text: '文本',
  word: '单词',
  phrase: '短语',
  save: '保存',
  learn: '学习',
  browser: '浏览器',
  page: '页面'
};

const languageLabels: Record<ExplanationLanguage, string> = {
  'zh-CN': 'Simplified Chinese',
  'zh-TW': 'Traditional Chinese',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  pt: 'Portuguese',
  it: 'Italian',
  ru: 'Russian',
  ar: 'Arabic'
};

type TranslationRequest = {
  text: string;
  sentenceContext?: string;
  settings: Settings;
};

type LlmTranslation = {
  translation: string;
  explanation?: string;
};

const providerErrorLabels: Record<LlmProvider, string> = {
  google: 'Google Gemini',
  openai: 'OpenAI'
};

export function createMockTranslation(
  text: string,
  explanationLanguage: ExplanationLanguage
): string {
  if (explanationLanguage !== 'zh-CN') {
    return `[Mock translation to ${explanationLanguage}] ${text}`;
  }

  const translatedWords = text
    .toLowerCase()
    .match(/[a-z]+/g)
    ?.map((word) => dictionary[word])
    .filter(Boolean);

  if (translatedWords?.length) {
    return `[MVP 模拟翻译] ${translatedWords.join(' / ')}`;
  }

  return `[MVP 模拟翻译] ${text}`;
}

export function parseLlmTranslation(text: string): LlmTranslation {
  const trimmedText = text.trim();
  const jsonText = trimmedText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(jsonText) as Partial<LlmTranslation>;
    return {
      translation: String(parsed.translation ?? '').trim(),
      explanation: parsed.explanation ? String(parsed.explanation).trim() : undefined
    };
  } catch {
    return {
      translation: trimmedText
    };
  }
}

function createLanguageModel(settings: Settings): LanguageModel {
  if (settings.llmProvider === 'google') {
    const google = createGoogle({
      apiKey: settings.apiKey.trim()
    });
    return google(settings.llmModel);
  }

  const openai = createOpenAI({
    apiKey: settings.apiKey.trim()
  });
  return openai(settings.llmModel);
}

export async function translateWithConfiguredProvider({
  text,
  sentenceContext,
  settings
}: TranslationRequest): Promise<TranslateResponse> {
  if (!settings.apiKey.trim()) {
    return {
      ok: false,
      error: 'Please add your LLM API key in LinguaLens settings before translating.'
    };
  }

  try {
    const languageLabel = languageLabels[settings.explanationLanguage];
    const prompt = [
      `Selected text: ${text}`,
      sentenceContext ? `Sentence context: ${sentenceContext}` : '',
      '',
      `Respond in ${languageLabel}. Return compact JSON with "translation" and optional "explanation".`,
      'Keep the translation faithful and the explanation brief.'
    ]
      .filter(Boolean)
      .join('\n');

    const result = await generateText({
      model: createLanguageModel(settings),
      system:
        'You help readers understand foreign-language web text. Never include API keys or private settings in the response.',
      prompt
    });
    const parsed = parseLlmTranslation(result.text);

    if (!parsed.translation) {
      return {
        ok: false,
        error: 'The LLM provider returned an empty translation.'
      };
    }

    return {
      ok: true,
      translation: parsed.translation,
      explanation: parsed.explanation,
      provider: settings.llmProvider,
      model: settings.llmModel
    };
  } catch {
    return {
      ok: false,
      error: `Unable to translate with ${providerErrorLabels[settings.llmProvider]}.`
    };
  }
}
