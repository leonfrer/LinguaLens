import { LLM_PROVIDERS } from './providers';
import type { LlmProvider } from './types';

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
  provider
}: {
  apiKey: string;
  provider: LlmProvider;
}): Promise<ModelOption[]> {
  const trimmedApiKey = apiKey.trim();

  if (!trimmedApiKey) {
    throw new Error('Please add your LLM API key before loading models.');
  }

  const providerConfig = LLM_PROVIDERS[provider];
  const response = await fetch(`${providerConfig.baseUrl}/models`, {
    headers: {
      Authorization: `Bearer ${trimmedApiKey}`
    }
  });

  if (!response.ok) {
    throw new Error(`Unable to load models from ${providerConfig.label}.`);
  }

  return normalizeModelOptions((await response.json()) as ProviderModelResponse);
}
