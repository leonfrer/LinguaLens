import type { LlmProvider } from './types';

type ProviderConfig = {
  label: string;
  baseUrl: string;
  defaultModel: string;
  legacyModels?: string[];
  apiKeyPlaceholder: string;
};

export const SUPPORTED_LLM_PROVIDER: LlmProvider = 'nvidia';

export const LLM_PROVIDERS: Record<LlmProvider, ProviderConfig> = {
  nvidia: {
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.1-8b-instruct',
    legacyModels: ['nvidia/llama-3.1-nemotron-nano-8b-v1'],
    apiKeyPlaceholder: 'NVIDIA API key'
  }
};

export const DEFAULT_LLM_PROVIDER_CONFIG = LLM_PROVIDERS[SUPPORTED_LLM_PROVIDER];
