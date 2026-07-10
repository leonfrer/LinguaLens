import type { LlmEndpointPreset, LlmProvider } from './types';

type LlmProviderConfig = {
  label: string;
};

type EndpointConfig = {
  label: string;
  baseUrl: string;
  defaultModel: string;
  legacyModels?: string[];
};

export const SUPPORTED_LLM_PROVIDER: LlmProvider = 'openai-compatible';
export const DEFAULT_LLM_ENDPOINT_PRESET: LlmEndpointPreset = 'nvidia';

export const LLM_PROVIDERS: Record<LlmProvider, LlmProviderConfig> = {
  'openai-compatible': {
    label: 'OpenAI-compatible'
  }
};

export const LLM_PROVIDER_OPTIONS = Object.entries(LLM_PROVIDERS).map(([value, config]) => ({
  value: value as LlmProvider,
  label: config.label
}));

export const OPENAI_COMPATIBLE_ENDPOINTS: Record<LlmEndpointPreset, EndpointConfig> = {
  openai: {
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini'
  },
  nvidia: {
    label: 'NVIDIA NIM',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    defaultModel: 'meta/llama-3.1-8b-instruct',
    legacyModels: ['nvidia/llama-3.1-nemotron-nano-8b-v1']
  },
  openrouter: {
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o-mini'
  },
  groq: {
    label: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.1-8b-instant'
  },
  deepinfra: {
    label: 'DeepInfra',
    baseUrl: 'https://api.deepinfra.com/v1/openai',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct'
  },
  together: {
    label: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    defaultModel: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'
  },
  local: {
    label: 'LM Studio',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model'
  },
  ollama: {
    label: 'Ollama',
    baseUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.1'
  },
  custom: {
    label: 'Custom',
    baseUrl: '',
    defaultModel: ''
  }
};

export const OPENAI_COMPATIBLE_ENDPOINT_OPTIONS = Object.entries(OPENAI_COMPATIBLE_ENDPOINTS).map(
  ([value, config]) => ({
    value: value as LlmEndpointPreset,
    label: config.label
  })
);

export const DEFAULT_LLM_ENDPOINT_CONFIG =
  OPENAI_COMPATIBLE_ENDPOINTS[DEFAULT_LLM_ENDPOINT_PRESET];

export function isLlmProvider(provider: string | undefined): provider is LlmProvider {
  return Boolean(provider && provider in LLM_PROVIDERS);
}

export function isLlmEndpointPreset(
  endpointPreset: string | undefined
): endpointPreset is LlmEndpointPreset {
  return Boolean(endpointPreset && endpointPreset in OPENAI_COMPATIBLE_ENDPOINTS);
}

export function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

export function getEndpointLabel(endpointPreset: LlmEndpointPreset, baseUrl: string): string {
  if (endpointPreset !== 'custom') {
    return OPENAI_COMPATIBLE_ENDPOINTS[endpointPreset].label;
  }

  return normalizeBaseUrl(baseUrl) || OPENAI_COMPATIBLE_ENDPOINTS.custom.label;
}
