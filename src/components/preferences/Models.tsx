import { AVAILABLE_MODELS } from '../ModelSelector';
import { ModelIcon } from '../ModelIcon';
import { formatProviderName } from '@/lib/utils';
import { ApiKeys } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import React from 'react';

interface ModelsProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableProviders: string[];
  apiKeys: ApiKeys;
}

export const Models = ({ selectedModel, onModelChange, availableProviders, apiKeys }: ModelsProps) => {
  // Filter available models based on verified API keys
  const availableModels = AVAILABLE_MODELS.filter(model => {
    // Check if the provider has a non-empty API key
    const hasKey = apiKeys[model.provider] && apiKeys[model.provider].trim().length > 0;
    return hasKey;
  });

  // Ensure we have a valid selected model
  React.useEffect(() => {
    if (availableModels.length > 0 && (!selectedModel || !availableModels.some(m => m.id === selectedModel))) {
      onModelChange(availableModels[0].id);
    }
  }, [selectedModel, availableModels, onModelChange]);

  // Get the current model's display info
  const currentModel = availableModels.find(m => m.id === selectedModel) || availableModels[0];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Remote Models</h3>
        <p className="text-sm text-muted-foreground">
          Select which model to use for chat. Models are shown for providers with configured API keys.
        </p>
      </div>

      <div className="space-y-4">
        {availableModels.length > 0 ? (
          <Select 
            value={selectedModel} 
            onValueChange={onModelChange}
          >
            <SelectTrigger className="w-full">
              <div className="flex items-center gap-2">
                {currentModel && (
                  <>
                    <ModelIcon modelId={currentModel.id} className="h-4 w-4" />
                    <span>{currentModel.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatProviderName(currentModel.provider)})
                    </span>
                  </>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              {availableModels.map(model => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <ModelIcon modelId={model.id} className="h-4 w-4" />
                    <span>{model.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatProviderName(model.provider)})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm text-muted-foreground">
            No models available. Please configure API keys in the APIs section.
          </div>
        )}
      </div>
    </div>
  );
};