export interface Model {
  id: string;
  name: string;
  provider: string;
  description: string;
  maxTokens: number;
  enabled: boolean;
}

export const AVAILABLE_MODELS: Model[] = [
  // OpenAI Models - GPT-4 Turbo
  {
    id: 'gpt-4-0125-preview',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'Most capable GPT-4 model with improved performance',
    maxTokens: 128000,
    enabled: true
  },
  {
    id: 'gpt-4-vision-preview',
    name: 'GPT-4 Vision',
    provider: 'openai',
    description: 'GPT-4 with vision capabilities',
    maxTokens: 128000,
    enabled: true
  },
  
  // OpenAI Models - GPT-4
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'openai',
    description: 'Most capable GPT-4 model',
    maxTokens: 8192,
    enabled: true
  },
  {
    id: 'gpt-4-32k',
    name: 'GPT-4 32k',
    provider: 'openai',
    description: 'GPT-4 with extended context window',
    maxTokens: 32768,
    enabled: true
  },
  
  // OpenAI Models - GPT-3.5
  {
    id: 'gpt-3.5-turbo-0125',
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    description: 'Most capable GPT-3.5 model',
    maxTokens: 16384,
    enabled: true
  },
  {
    id: 'gpt-3.5-turbo-16k-0613',
    name: 'GPT-3.5 Turbo 16k',
    provider: 'openai',
    description: 'GPT-3.5 with extended context window',
    maxTokens: 16384,
    enabled: true
  },
  
  // Anthropic Models
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    provider: 'anthropic',
    description: 'Most capable Claude model',
    maxTokens: 200000,
    enabled: true
  },
  {
    id: 'claude-3-sonnet-20240229',
    name: 'Claude 3 Sonnet',
    provider: 'anthropic',
    description: 'Balanced Claude model',
    maxTokens: 200000,
    enabled: true
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    provider: 'anthropic',
    description: 'Fast and efficient Claude model',
    maxTokens: 200000,
    enabled: true
  },
  
  // Perplexity Models
  {
    id: 'llama-3.1-sonar-small-128k-online',
    name: 'Sonar Small Online (8B)',
    provider: 'perplexity',
    description: 'Online Sonar model with 8B parameters',
    maxTokens: 128000,
    enabled: true
  },
  {
    id: 'llama-3.1-sonar-large-128k-online',
    name: 'Sonar Large Online (70B)',
    provider: 'perplexity',
    description: 'Online Sonar model with 70B parameters',
    maxTokens: 128000,
    enabled: true
  },
  {
    id: 'llama-3.1-sonar-huge-128k-online',
    name: 'Sonar Huge Online (405B)',
    provider: 'perplexity',
    description: 'Online Sonar model with 405B parameters',
    maxTokens: 128000,
    enabled: true
  },
  {
    id: 'llama-3.1-sonar-small-128k-chat',
    name: 'Sonar Small Chat (8B)',
    provider: 'perplexity',
    description: 'Chat-optimized Sonar model with 8B parameters',
    maxTokens: 128000,
    enabled: true
  },
  {
    id: 'llama-3.1-sonar-large-128k-chat',
    name: 'Sonar Large Chat (70B)',
    provider: 'perplexity',
    description: 'Chat-optimized Sonar model with 70B parameters',
    maxTokens: 128000,
    enabled: true
  },
  {
    id: 'llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B',
    provider: 'perplexity',
    description: 'Llama 3.1 model with 8B parameters',
    maxTokens: 4096,
    enabled: true
  },
  {
    id: 'llama-3.1-70b-instruct',
    name: 'Llama 3.1 70B',
    provider: 'perplexity',
    description: 'Llama 3.1 model with 70B parameters',
    maxTokens: 4096,
    enabled: true
  },

  // xAI Models
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: 'xai',
    description: 'xAI Grok model beta version',
    maxTokens: 4096,
    enabled: true
  },

  // Google Models
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    provider: 'google',
    description: 'Google Gemini Pro model',
    maxTokens: 32768,
    enabled: true
  },
  {
    id: 'gemini-pro-vision',
    name: 'Gemini Pro Vision',
    provider: 'google',
    description: 'Google Gemini Pro model with vision capabilities',
    maxTokens: 32768,
    enabled: true
  }
];

export function getModelProvider(modelId: string): string | undefined {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  return model?.provider;
}

export function getModelById(modelId: string): Model | undefined {
  return AVAILABLE_MODELS.find(m => m.id === modelId);
}