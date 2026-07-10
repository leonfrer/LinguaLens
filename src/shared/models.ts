import { t } from './i18n';
import { getEndpointLabel, normalizeBaseUrl } from './providers';
import type { LlmEndpointPreset, Settings } from './types';

export type ModelOption = {
  id: string;
  label: string;
};

type ProviderModelResponse = {
  data?: Array<{
    id?: unknown;
  }>;
};

export function normalizeModelOptions(response: ProviderModelResponse): ModelOption[] {
  const seenModelIds = new Set<string>();

  return (response.data ?? [])
    .map((model) => (typeof model.id === 'string' ? model.id.trim() : ''))
    .filter((modelId) => {
      if (!modelId || seenModelIds.has(modelId)) {
        return false;
      }

      seenModelIds.add(modelId);
      return true;
    })
    .sort((left, right) => left.localeCompare(right))
    .map((modelId) => ({
      id: modelId,
      label: modelId
    }));
}

export async function fetchModelOptions({
  apiKey,
  baseUrl,
  endpointPreset
}: {
  apiKey: string;
  baseUrl: Settings['baseUrl'];
  endpointPreset: LlmEndpointPreset;
}): Promise<ModelOption[]> {
  const trimmedApiKey = apiKey.trim();
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);

  if (!trimmedApiKey) {
    throw new Error(t('modelApiKeyRequired'));
  }

  if (!normalizedBaseUrl) {
    throw new Error(t('modelBaseUrlRequired'));
  }

  const response = await fetch(`${normalizedBaseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${trimmedApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(
      t('modelProviderUnableToLoad', getEndpointLabel(endpointPreset, normalizedBaseUrl))
    );
  }

  return normalizeModelOptions((await response.json()) as ProviderModelResponse);
}
