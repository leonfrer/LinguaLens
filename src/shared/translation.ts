import { createOpenAI as createOpenAICompatible } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { ExplanationLanguage, LlmProvider, Settings, TranslateResponse } from './types';

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
  nvidia: 'NVIDIA NIM'
};

const NVIDIA_NIM_BASE_URL = 'https://integrate.api.nvidia.com/v1';

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

    const nvidia = createOpenAICompatible({
      apiKey: settings.apiKey.trim(),
      baseURL: NVIDIA_NIM_BASE_URL
    });
    const result = await generateText({
      model: nvidia.chat(settings.llmModel),
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
