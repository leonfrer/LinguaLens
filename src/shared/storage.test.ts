import { describe, expect, it, vi } from 'vitest';
import { createSavedItem, DEFAULT_SETTINGS, getSettings, SETTINGS_KEY } from './storage';

vi.stubGlobal('crypto', {
  randomUUID: () => 'fixed-id'
});

describe('createSavedItem', () => {
  it('adds metadata around a saved text payload', () => {
    expect(
      createSavedItem(
        {
          text: 'hello',
          translation: '你好',
          explanationLanguage: 'zh-CN',
          sentenceContext: 'Well, hello there.',
          explanation: 'A greeting.',
          provider: 'openai',
          model: 'gpt-4o-mini',
          sourceUrl: 'https://example.com',
          sourceTitle: 'Example'
        },
        123
      )
    ).toEqual({
      id: '123-fixed-id',
      text: 'hello',
      translation: '你好',
      explanationLanguage: 'zh-CN',
      sentenceContext: 'Well, hello there.',
      explanation: 'A greeting.',
      provider: 'openai',
      model: 'gpt-4o-mini',
      sourceUrl: 'https://example.com',
      sourceTitle: 'Example',
      createdAt: 123
    });
  });
});

describe('getSettings', () => {
  it('migrates the previous targetLanguage field to explanationLanguage', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              targetLanguage: 'en',
              apiKey: 'test-key'
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      explanationLanguage: 'en',
      apiKey: 'test-key'
    });
  });
});
