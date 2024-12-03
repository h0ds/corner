export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  enabled: boolean;
}

export const AVAILABLE_MODELS: Model[] = [
  {
    id: 'claude-2.1',
    name: 'Claude 2.1',
    provider: 'anthropic',
    description: 'Latest version of Claude with improved performance',
    maxTokens: 200000,
    enabled: true
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Most capable GPT-4 model with improved performance',
    maxTokens: 128000,
    enabled: true
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'Most capable GPT-4 model',
    maxTokens: 8192,
    enabled: true
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Most capable GPT-3.5 model',
    maxTokens: 4096,
    enabled: true
  },
  {
    id: 'mixtral-8x7b',
    name: 'Mixtral 8x7B',
    provider: 'perplexity',
    description: 'Open source model with strong performance',
    maxTokens: 4096,
    enabled: true
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    description: 'Google\'s most capable model',
    maxTokens: 32768,
    enabled: true
  },
  {
    id: 'xai-chat',
    name: 'XAI Chat',
    provider: 'xai',
    description: 'XAI\'s chat model',
    maxTokens: 4096,
    enabled: true
  }
];

export const getModelProvider = (modelId: string): string | undefined => {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  return model?.provider;
};

export const getModelById = (modelId: string): Model | undefined => {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}; 