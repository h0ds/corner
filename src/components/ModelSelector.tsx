import React, { useRef, useEffect, useState } from 'react';
import { ModelIcon } from './ModelIcon';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger
} from "@/components/ui/select";
import { formatProviderName } from '@/lib/utils';

export interface Model {
  id: string;
  name: string;
  provider: 'anthropic' | 'perplexity' | 'openai' | 'xai' | 'google';
}

export const DEFAULT_MODEL = 'claude-3-sonnet-20240229';

export const AVAILABLE_MODELS: Model[] = [
  // OpenAI Models - GPT-4 Turbo
  { id: 'gpt-4-0125-preview', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision', provider: 'openai' },
  
  // OpenAI Models - GPT-4
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt-4-32k', name: 'GPT-4 32k', provider: 'openai' },
  
  // OpenAI Models - GPT-3.5
  { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo', provider: 'openai' },
  { id: 'gpt-3.5-turbo-16k-0613', name: 'GPT-3.5 Turbo 16k', provider: 'openai' },
  
  // Anthropic Models
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  
  // Perplexity Models
  { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online (8B)', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online (70B)', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge Online (405B)', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-small-128k-chat', name: 'Sonar Small Chat (8B)', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large Chat (70B)', provider: 'perplexity' },
  { id: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'perplexity' },
  { id: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'perplexity' },

  // xAI Models
  { id: 'grok-beta', name: 'Grok Beta', provider: 'xai' },

  // Google Models
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google' },
  { id: 'gemini-pro-vision', name: 'Gemini Pro Vision', provider: 'google' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  apiKeys: {
    anthropic: string | null;
    perplexity: string | null;
    openai: string | null;
    xai: string | null;
    google: string | null;
  };
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  apiKeys
}) => {
  const [triggerWidth, setTriggerWidth] = useState(180);
  const measureRef = useRef<HTMLSpanElement>(null);

  const hasValidApiKey = (provider: string): boolean => {
    if (!apiKeys) return false;
    const key = apiKeys[provider as keyof typeof apiKeys];
    return key !== null && key.trim().length > 0;
  };

  const modelsByProvider = AVAILABLE_MODELS.reduce((acc, model) => {
    if (hasValidApiKey(model.provider)) {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
    }
    return acc;
  }, {} as Record<string, Model[]>);

  useEffect(() => {
    if (measureRef.current) {
      setTriggerWidth(measureRef.current.offsetWidth);
    }
  }, [selectedModel]);

  const selectedModelData = AVAILABLE_MODELS.find(m => m.id === selectedModel);
  const availableModels = Object.values(modelsByProvider).flat();

  // If selected model is not available (no API key), select the first available model
  useEffect(() => {
    if (availableModels.length > 0 && !availableModels.find(m => m.id === selectedModel)) {
      onModelChange(availableModels[0].id);
    }
  }, [selectedModel, availableModels, onModelChange]);

  if (!selectedModelData) {
    return null;
  }

  return (
    <Select value={selectedModel} onValueChange={onModelChange}>
      <SelectTrigger className="w-[180px]" style={{ width: `${triggerWidth + 32}px` }}>
        <span ref={measureRef} className="flex items-center gap-2">
          <ModelIcon modelId={selectedModel} className="h-4 w-4" />
          <span className="truncate">{selectedModelData.name}</span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(modelsByProvider).map(([provider, models]) => (
          <div key={provider} className="mb-2 last:mb-0">
            <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
              {formatProviderName(provider)}
            </div>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                <div className="flex items-center gap-2">
                  <ModelIcon modelId={model.id} className="h-4 w-4" />
                  <span>{model.name}</span>
                </div>
              </SelectItem>
            ))}
          </div>
        ))}
        {availableModels.length === 0 && (
          <div className="px-2 py-4 text-sm text-center text-muted-foreground">
            No models available. Please add API keys in Preferences.
          </div>
        )}
      </SelectContent>
    </Select>
  );
};
