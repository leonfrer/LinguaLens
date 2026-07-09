import { describe, expect, it } from 'vitest';
import { t } from './i18n';
import { DEFAULT_SETTINGS } from './storage';
import { parseLlmTranslation, translateWithConfiguredProvider } from './translation';

describe('translateWithConfiguredProvider', () => {
  it('returns a setup error before making LLM calls without an API key', async () => {
    await expect(
      translateWithConfiguredProvider({
        text: 'hello',
        settings: {
          ...DEFAULT_SETTINGS,
          apiKey: ''
        }
      })
    ).resolves.toEqual({
      ok: false,
      error: t('translationApiKeyRequired')
    });
  });
});

describe('parseLlmTranslation', () => {
  it('parses JSON wrapped in a markdown code fence', () => {
    expect(
      parseLlmTranslation(
        '```json\n{"translation":"此域名用于文档示例。","explanation":"一句简短说明。"}\n```'
      )
    ).toEqual({
      translation: '此域名用于文档示例。',
      explanation: '一句简短说明。'
    });
  });
});
