import { describe, expect, it, vi } from 'vitest';
import {
  CREDENTIALS_KEY,
  CONTENT_SETTINGS_KEY,
  createSavedItem,
  DEFAULT_SETTINGS,
  getContentSettings,
  getSavedItems,
  getSettings,
  initializeStorage,
  SAVED_ITEMS_KEY,
  SETTINGS_KEY,
  updateSettings
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
  it('restores a supported appearance and defaults invalid values to system', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ [SETTINGS_KEY]: { appearance: 'dark' } })
      .mockResolvedValueOnce({ [SETTINGS_KEY]: { appearance: 'sepia' } });
    vi.stubGlobal('chrome', { storage: { local: { get } } });

    await expect(getSettings()).resolves.toMatchObject({ appearance: 'dark' });
    await expect(getSettings()).resolves.toMatchObject({ appearance: 'system' });
  });

  it('keeps supported interface languages and defaults missing or invalid values to system', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ [SETTINGS_KEY]: { interfaceLanguage: 'zh-TW' } })
      .mockResolvedValueOnce({ [SETTINGS_KEY]: { interfaceLanguage: 'fr' } })
      .mockResolvedValueOnce({ [SETTINGS_KEY]: {} });
    vi.stubGlobal('chrome', { storage: { local: { get } } });

    await expect(getSettings()).resolves.toMatchObject({ interfaceLanguage: 'zh-TW' });
    await expect(getSettings()).resolves.toMatchObject({ interfaceLanguage: 'system' });
    await expect(getSettings()).resolves.toMatchObject({ interfaceLanguage: 'system' });
  });

  it('ignores an API key stored in the legacy settings object', async () => {
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
      ...DEFAULT_SETTINGS
    });
    expect(DEFAULT_SETTINGS.pronunciationLookupEnabled).toBe(false);
    expect(DEFAULT_SETTINGS.skipLongTextPronunciation).toBe(true);
  });

  it('reads the API key from credentials storage', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {},
            [CREDENTIALS_KEY]: { apiKey: 'credential-key' }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      apiKey: 'credential-key'
    });
  });

  it('migrates the previous IPA lookup setting to pronunciation lookup', async () => {
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {
              ipaLookupEnabled: true,
              skipSentencePronunciation: false
            }
          })
        }
      }
    });

    await expect(getSettings()).resolves.toEqual({
      ...DEFAULT_SETTINGS,
      pronunciationLookupEnabled: true,
      skipLongTextPronunciation: false
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
            },
            [CREDENTIALS_KEY]: { apiKey: 'test-key' }
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
            },
            [CREDENTIALS_KEY]: { apiKey: 'test-key' }
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
            },
            [CREDENTIALS_KEY]: { apiKey: 'test-key' }
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
            },
            [CREDENTIALS_KEY]: { apiKey: 'test-key' }
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
            },
            [CREDENTIALS_KEY]: { apiKey: 'test-key' }
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

describe('updateSettings', () => {
  it('updates regular settings without rewriting credentials', async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {},
            [CREDENTIALS_KEY]: { apiKey: 'credential-key' }
          }),
          set
        }
      }
    });

    await expect(updateSettings({ appearance: 'dark' })).resolves.toMatchObject({
      appearance: 'dark',
      apiKey: 'credential-key'
    });
    expect(set).toHaveBeenCalledTimes(1);
    const update = set.mock.calls[0][0];
    expect(update).not.toHaveProperty(CREDENTIALS_KEY);
    expect(update[SETTINGS_KEY]).not.toHaveProperty('apiKey');
  });

  it('stores an API key separately from regular settings', async () => {
    const set = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({ [SETTINGS_KEY]: {} }),
          set
        }
      }
    });

    await expect(updateSettings({ apiKey: 'new-key' })).resolves.toMatchObject({
      apiKey: 'new-key'
    });
    const update = set.mock.calls[0][0];
    expect(update[CREDENTIALS_KEY]).toEqual({ apiKey: 'new-key' });
    expect(update[SETTINGS_KEY]).not.toHaveProperty('apiKey');
  });
});

describe('content settings', () => {
  it('projects only the settings needed by content scripts', () => {
    expect(getContentSettings({ ...DEFAULT_SETTINGS, apiKey: 'secret-key' })).toEqual({
      appearance: 'system',
      interfaceLanguage: 'system',
      wordLookupEnabled: true,
      explanationLanguage: 'zh-CN'
    });
  });

  it('restricts local storage and publishes the safe projection to session storage', async () => {
    const localSetAccessLevel = vi.fn().mockResolvedValue(undefined);
    const sessionSetAccessLevel = vi.fn().mockResolvedValue(undefined);
    const sessionSet = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({
            [SETTINGS_KEY]: {},
            [CREDENTIALS_KEY]: { apiKey: 'secret-key' }
          }),
          setAccessLevel: localSetAccessLevel
        },
        session: {
          set: sessionSet,
          setAccessLevel: sessionSetAccessLevel
        }
      }
    });

    await expect(initializeStorage()).resolves.toMatchObject({ apiKey: 'secret-key' });
    expect(localSetAccessLevel).toHaveBeenCalledWith({ accessLevel: 'TRUSTED_CONTEXTS' });
    expect(sessionSetAccessLevel).toHaveBeenCalledWith({
      accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS'
    });
    expect(sessionSet).toHaveBeenCalledWith({
      [CONTENT_SETTINGS_KEY]: {
        appearance: 'system',
        interfaceLanguage: 'system',
        wordLookupEnabled: true,
        explanationLanguage: 'zh-CN'
      }
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
