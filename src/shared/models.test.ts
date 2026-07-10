import { describe, expect, it, vi } from 'vitest';
import { t } from './i18n';
import { fetchModelOptions, normalizeModelOptions } from './models';

describe('normalizeModelOptions', () => {
  it('returns sorted unique model IDs from provider responses', () => {
    expect(
      normalizeModelOptions({
        data: [
          { id: 'z-model' },
          { id: 'a-model' },
          { id: 'z-model' },
          { id: '' },
          { id: 123 }
        ]
      })
    ).toEqual([
      { id: 'a-model', label: 'a-model' },
      { id: 'z-model', label: 'z-model' }
    ]);
  });
});

describe('fetchModelOptions', () => {
  it('requires an API key before making provider requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchModelOptions({
        apiKey: '',
        baseUrl: 'https://integrate.api.nvidia.com/v1',
        endpointPreset: 'nvidia'
      })
    ).rejects.toThrow(t('modelApiKeyRequired'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('requires a base URL before making provider requests', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchModelOptions({
        apiKey: 'test-key',
        baseUrl: '',
        endpointPreset: 'custom'
      })
    ).rejects.toThrow(t('modelBaseUrlRequired'));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('loads models with the configured provider API key and base URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 'meta/llama-3.1-8b-instruct' }]
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      fetchModelOptions({
        apiKey: 'test-key',
        baseUrl: 'https://integrate.api.nvidia.com/v1/',
        endpointPreset: 'nvidia'
      })
    ).resolves.toEqual([
      {
        id: 'meta/llama-3.1-8b-instruct',
        label: 'meta/llama-3.1-8b-instruct'
      }
    ]);
    expect(fetchMock).toHaveBeenCalledWith('https://integrate.api.nvidia.com/v1/models', {
      headers: {
        Authorization: 'Bearer test-key'
      }
    });
  });
});
