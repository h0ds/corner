import React, { useRef, useEffect, useState } from 'react';
import { ModelIcon } from './ModelIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger
} from "@/components/ui/select";
import { ApiKeys } from '@/types';
import { formatProviderName } from '@/lib/utils';

export interface Model {
  id: string;
  name: string;
  provider: 'anthropic' | 'perplexity' | 'openai' | 'xai' | 'google' | 'elevenlabs';
}

export const DEFAULT_MODEL = 'claude-3-sonnet-20240229';

export const AVAILABLE_MODELS: Model[] = [
  // OpenAI Models - GPT-4 Turbo
  { id: 'gpt-4-0125-preview', name: 'GPT-4 Turbo Preview', provider: 'openai' },
  { id: 'gpt-4-1106-preview', name: 'GPT-4 Turbo (Previous)', provider: 'openai' },
  { id: 'gpt-4-vision-preview', name: 'GPT-4 Vision', provider: 'openai' },
  
  // OpenAI Models - GPT-4
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt-4-32k', name: 'GPT-4 32k', provider: 'openai' },
  
  // OpenAI Models - GPT-3.5
  { id: 'gpt-3.5-turbo-0125', name: 'GPT-3.5 Turbo', provider: 'openai' },
  { id: 'gpt-3.5-turbo-instruct', name: 'GPT-3.5 Turbo Instruct', provider: 'openai' },
  { id: 'gpt-3.5-turbo-16k', name: 'GPT-3.5 Turbo 16k', provider: 'openai' },
  
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
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'google' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'google' },
  { id: 'gemini-1.0-pro', name: 'Gemini 1.0 Pro', provider: 'google' },

  // ElevenLabs Models
  { id: 'elevenlabs-v1', name: 'ElevenLabs TTS', provider: 'elevenlabs' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  apiKeys: ApiKeys;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  apiKeys
}) => {
  const [triggerWidth, setTriggerWidth] = useState(180);
  const measureRef = useRef<HTMLSpanElement>(null);

  // Update the hasValidApiKey function to properly check API keys
  const hasValidApiKey = (provider: string): boolean => {
    if (!apiKeys) return false;
    
    // Debug log to check what keys we have
    console.log('Checking API key for provider:', provider, {
      hasKey: !!apiKeys[provider as keyof typeof apiKeys],
      keyLength: apiKeys[provider as keyof typeof apiKeys]?.length
    });
    
    const key = apiKeys[provider as keyof typeof apiKeys];
    return typeof key === 'string' && key.trim().length > 0;
  };

  // Update the modelsByProvider reducer for better debugging
  const modelsByProvider = AVAILABLE_MODELS.reduce((acc, model) => {
    const isValid = hasValidApiKey(model.provider);
    console.log(`Provider ${model.provider} for model ${model.name}: ${isValid ? 'valid' : 'invalid'}`);
    
    if (isValid) {
      if (!acc[model.provider]) {
        acc[model.provider] = [];
      }
      acc[model.provider].push(model);
    }
    return acc;
  }, {} as Record<string, Model[]>);

  // Add debug logging after reduction
  console.log('Available models by provider:', Object.keys(modelsByProvider));
  console.log('Total available models:', Object.values(modelsByProvider).flat().length);

  // Get current model data
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  // If current model's provider is not configured, select first available model
  useEffect(() => {
    if (currentModel && !hasValidApiKey(currentModel.provider)) {
      const firstAvailableModel = AVAILABLE_MODELS.find(m => hasValidApiKey(m.provider));
      if (firstAvailableModel) {
        onModelChange(firstAvailableModel.id);
      }
    }
  }, [currentModel, apiKeys, onModelChange]);

  // Update width based on model names
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

  // Check if any provider has a valid API key
  const hasAnyValidKey = Object.values(modelsByProvider).some(models => models.length > 0);

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
          {Object.entries(modelsByProvider).length > 0 ? (
            Object.entries(modelsByProvider).map(([provider, models]) => {
              console.log(`Rendering provider ${provider} with ${models.length} models`);
              return (
                <React.Fragment key={provider}>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground capitalize">
                    {formatProviderName(provider)}
                  </div>
                  {models.map(model => (
                    <SelectItem 
                      key={model.id} 
                      value={model.id}
                      className="cursor-pointer"
                    >
                      <div className="flex items-center gap-2 w-full truncate">
                        <ModelIcon modelId={model.id} className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{model.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </React.Fragment>
              );
            })
          ) : (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No models available. Please add API keys in settings.
              {/* Add debug info */}
              <div className="mt-2 text-xs opacity-50">
                Available keys: {Object.entries(apiKeys || {})
                  .filter(([_, v]) => typeof v === 'string' && v.trim().length > 0)
                  .map(([k]) => k)
                  .join(', ')}
              </div>
            </div>
          )}
        </SelectContent>
      </Select>
    </>
  );
};
