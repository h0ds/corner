import React, { useRef, useEffect, useState } from 'react';
import { ModelIcon } from './ModelIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { ApiKeys } from '@/types';

export interface Model {
  id: string;
  name: string;
  provider: 'anthropic' | 'perplexity' | 'openai' | 'xai' | 'google';
}

export const DEFAULT_MODEL = 'claude-3-sonnet-20240229';

export const AVAILABLE_MODELS: Model[] = [
  // Anthropic Models
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  
  // OpenAI Models
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  
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
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'google' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
  apiKeys: ApiKeys;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled,
  apiKeys
}) => {
  const [triggerWidth, setTriggerWidth] = useState(180);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Check if a specific provider has a valid API key
  const hasValidApiKey = (provider: string): boolean => {
    if (!apiKeys) return false;
    const key = apiKeys[provider as keyof typeof apiKeys];
    return typeof key === 'string' && key.trim().length > 0;
  };

  // Get available models based on API keys
  const getAvailableModels = () => {
    return AVAILABLE_MODELS.filter(model => hasValidApiKey(model.provider));
  };

  // Check if any models are available
  const hasAvailableModels = (): boolean => {
    return getAvailableModels().length > 0;
  };

  // Group all models by provider
  const modelsByProvider = AVAILABLE_MODELS.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  // Get current model data
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  // Debug logging
  console.log('ModelSelector state:', {
    apiKeys: {
      anthropic: apiKeys?.anthropic ? 'set' : 'not set',
      perplexity: apiKeys?.perplexity ? 'set' : 'not set',
      openai: apiKeys?.openai ? 'set' : 'not set',
      xai: apiKeys?.xai ? 'set' : 'not set',
      google: apiKeys?.google ? 'set' : 'not set'
    },
    availableModels: getAvailableModels().map(m => m.name),
    hasAvailable: hasAvailableModels(),
    currentModel: currentModel?.name
  });

  // If current model's provider is not configured, select first available model
  useEffect(() => {
    if (currentModel && !hasValidApiKey(currentModel.provider)) {
      const firstAvailableModel = getAvailableModels()[0];
      if (firstAvailableModel) {
        onModelChange(firstAvailableModel.id);
      }
    }
  }, [currentModel, onModelChange, apiKeys]);

  // Update width based on all model names
  useEffect(() => {
    if (measureRef.current) {
      const widths = AVAILABLE_MODELS.map(model => {
        measureRef.current!.textContent = model.name;
        return measureRef.current!.offsetWidth;
      });
      const maxWidth = Math.max(...widths, measureRef.current.offsetWidth);
      setTriggerWidth(Math.max(180, maxWidth + 56));
    }
  }, [currentModel?.name]);

  return (
    <>
      <span 
        ref={measureRef} 
        className="absolute invisible whitespace-nowrap text-sm"
        aria-hidden="true"
      >
        {currentModel?.name || 'Select Model'}
      </span>

      <Select 
        defaultValue={selectedModel}
        value={selectedModel}
        onValueChange={onModelChange}
        disabled={disabled || !hasAvailableModels()}
      >
        <SelectTrigger 
          className="rounded-md text-sm"
          style={{ width: `${triggerWidth}px` }}
        >
          <div className="flex items-center gap-2 truncate">
            <ModelIcon modelId={selectedModel} className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{currentModel?.name || 'Select Model'}</span>
          </div>
        </SelectTrigger>
        
        <SelectContent 
          align="end"
          style={{ width: `${triggerWidth}px` }}
        >
          {Object.entries(modelsByProvider).map(([provider, models]) => {
            const providerHasKey = hasValidApiKey(provider);
            return (
              <React.Fragment key={provider}>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground capitalize flex items-center justify-between">
                  <span>{provider}</span>
                  {!providerHasKey && (
                    <span className="text-xs text-yellow-500">(API key required)</span>
                  )}
                </div>
                {models.map(model => (
                  <SelectItem 
                    key={model.id} 
                    value={model.id}
                    className="cursor-pointer"
                    disabled={!providerHasKey}
                  >
                    <div className="flex items-center gap-2 w-full truncate">
                      <ModelIcon modelId={model.id} className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{model.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </React.Fragment>
            );
          })}

          {!hasAvailableModels() && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No models available. Please add API keys in settings.
            </div>
          )}
        </SelectContent>
      </Select>
    </>
  );
};
