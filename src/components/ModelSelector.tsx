import React, { useRef, useEffect, useState } from 'react';
import { ModelIcon } from './ModelIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  availableProviders?: ('anthropic' | 'perplexity' | 'openai' | 'xai' | 'google')[];
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled,
  availableProviders = []
}) => {
  const [triggerWidth, setTriggerWidth] = useState(180);
  const measureRef = useRef<HTMLSpanElement>(null);
  
  // Get available models based on providers
  const availableModels = AVAILABLE_MODELS.filter(m => availableProviders.includes(m.provider));

  // Group models by provider
  const modelsByProvider = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  // Get current model data
  const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel);

  // Handle model change
  const handleModelChange = (modelId: string) => {
    console.log('Model change:', { from: selectedModel, to: modelId });
    onModelChange(modelId);
  };

  // Update width based on all model names
  useEffect(() => {
    if (measureRef.current) {
      // Measure all model names to find the longest one
      const widths = availableModels.map(model => {
        measureRef.current!.textContent = model.name;
        return measureRef.current!.offsetWidth;
      });
      const maxWidth = Math.max(...widths, measureRef.current.offsetWidth);
      setTriggerWidth(Math.max(180, maxWidth + 56)); // 56px for padding and icon
    }
  }, [availableModels, currentModel?.name]);

  return (
    <>
      {/* Hidden element to measure text width */}
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
        onValueChange={handleModelChange}
        disabled={disabled || availableModels.length === 0}
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
          {Object.entries(modelsByProvider).map(([provider, models]) => (
            <React.Fragment key={provider}>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground capitalize">
                {provider}
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
          ))}

          {availableModels.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted-foreground text-center">
              No models available. Please add API keys in settings.
            </div>
          )}
        </SelectContent>
      </Select>
    </>
  );
};
