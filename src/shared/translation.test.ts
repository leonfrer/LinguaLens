import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './storage';
import {
  createMockTranslation,
  parseLlmTranslation,
  translateWithConfiguredProvider
} from './translation';

describe('createMockTranslation', () => {
  it('marks Chinese mock output clearly', () => {
    expect(createMockTranslation('hello world', 'zh-CN')).toBe(
      '[MVP 模拟翻译] 你好 / 世界'
    );
  });

  it('keeps unsupported target language output explicit', () => {
    expect(createMockTranslation('hello', 'en')).toBe('[Mock translation to en] hello');
  });
});

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
      error: 'Please add your LLM API key in LinguaLens settings before translating.'
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
