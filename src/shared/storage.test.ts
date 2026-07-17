import { describe, expect, it, vi } from 'vitest';
import {
  createSavedItem,
  DEFAULT_SETTINGS,
  getSavedItems,
  getSettings,
  SAVED_ITEMS_KEY,
  SETTINGS_KEY
} from './storage';

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
          pronunciation: '/həˈloʊ/',
          pronunciationNotation: 'IPA',
          explanationLanguage: 'zh-CN',
          sentenceContext: 'Well, hello there.',
          explanation: 'A greeting.',
          provider: 'openai-compatible',
          model: 'meta/llama-3.1-8b-instruct',
          sourceUrl: 'https://example.com',
          sourceTitle: 'Example'
        },
        123
      )
    ).toEqual({
      id: '123-fixed-id',
      text: 'hello',
      translation: '你好',
      pronunciation: '/həˈloʊ/',
      pronunciationNotation: 'IPA',
      explanationLanguage: 'zh-CN',
      sentenceContext: 'Well, hello there.',
      explanation: 'A greeting.',
      provider: 'openai-compatible',
      model: 'meta/llama-3.1-8b-instruct',
      sourceUrl: 'https://example.com',
      sourceTitle: 'Example',
      createdAt: 123
    });
  });
});

describe('getSettings', () => {
  it('defaults word lookup on and pronunciation lookup off for existing users', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              apiKey: 'test-key'
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      apiKey: 'test-key'
    });
    expect(DEFAULT_SETTINGS.pronunciationLookupEnabled).toBe(false);
  });

  it('migrates the previous IPA lookup setting to pronunciation lookup', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              ipaLookupEnabled: true
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      pronunciationLookupEnabled: true
    });
  });

  it('normalizes saved common and custom pronunciation preferences', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              pronunciationPreferences: {
                English: 'Auto',
                Japanese: 'Custom Kana',
                Cantonese: 'Jyutping',
                Empty: '   ',
                Invalid: 123
              }
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      pronunciationPreferences: [
        {
          id: 'legacy-preference-1',
          languageLabel: 'English',
          notationLabel: 'IPA',
          enabled: true
        },
        {
          id: 'legacy-preference-2',
          languageLabel: 'Japanese',
          notationLabel: 'Custom Kana',
          enabled: true
        },
        {
          id: 'legacy-preference-3',
          languageLabel: 'Cantonese',
          notationLabel: 'Jyutping',
          enabled: true
        }
      ]
    });
  });

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

  it('keeps supported OpenAI-compatible provider settings', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              llmProvider: 'openai-compatible',
              llmEndpointPreset: 'openai',
              llmModel: 'gpt-4o-mini',
              apiKey: 'test-key'
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      llmProvider: 'openai-compatible',
      llmEndpointPreset: 'openai',
      baseUrl: 'https://api.openai.com/v1',
      llmModel: 'gpt-4o-mini',
      apiKey: 'test-key'
    });
  });

  it('migrates legacy provider values to OpenAI-compatible endpoint presets', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              llmProvider: 'openrouter',
              llmModel: 'openai/gpt-4o-mini',
              apiKey: 'test-key'
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      llmProvider: 'openai-compatible',
      llmEndpointPreset: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
      llmModel: 'openai/gpt-4o-mini',
      apiKey: 'test-key'
    });
  });

  it('migrates unknown provider settings to the supported default provider', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              llmProvider: 'removed-provider',
              llmModel: 'removed-model',
              apiKey: 'test-key'
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      apiKey: 'test-key'
    });
  });

  it('normalizes custom base URLs', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              llmProvider: 'custom',
              llmEndpointPreset: 'custom',
              baseUrl: ' https://api.example.com/v1/ ',
              llmModel: 'example-model',
              apiKey: 'test-key'
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      llmProvider: 'openai-compatible',
      llmEndpointPreset: 'custom',
      baseUrl: 'https://api.example.com/v1',
      llmModel: 'example-model',
      apiKey: 'test-key'
    });
  });
});

describe('getSavedItems', () => {
  it('reads the previous IPA field as pronunciation', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SAVED_ITEMS_KEY]: [
              {
                id: 'legacy-item',
                text: 'hello',
                translation: '你好',
                ipa: '/həˈloʊ/',
                explanationLanguage: 'zh-CN',
                sourceUrl: 'https://example.com',
                sourceTitle: 'Example',
                createdAt: 123
              }
            ]
          })
        }
      }
    });

    await expect(getSavedItems()).resolves.toEqual([
      {
        id: 'legacy-item',
        text: 'hello',
        translation: '你好',
        pronunciation: '/həˈloʊ/',
        explanationLanguage: 'zh-CN',
        sourceUrl: 'https://example.com',
        sourceTitle: 'Example',
        createdAt: 123
      }
    ]);
  });
});
