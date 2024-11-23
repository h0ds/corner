import React from 'react';
import { AVAILABLE_MODELS } from '../ModelSelector';
import { ModelIcon } from '../ModelIcon';
import { formatProviderName } from '@/lib/utils';
import { ApiKeys } from '@/types';

interface ModelsProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableProviders: string[];
  apiKeys: ApiKeys;
}

export const Models: React.FC<ModelsProps> = ({
  selectedModel,
  onModelChange,
  availableProviders,
  apiKeys
}) => {
  const availableModels = AVAILABLE_MODELS.filter(model => {
    const hasKey = apiKeys[model.provider] && apiKeys[model.provider].length > 0;
    return hasKey;
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Select which model to use for chat. Only models from providers with valid API keys are shown.
        </p>
      </div>

      <div className="grid gap-4">
        {availableModels.map(model => (
          <div key={model.id} className="flex items-center space-x-4">
            <input
              type="radio"
              id={model.id}
              name="model"
              value={model.id}
              checked={selectedModel === model.id}
              onChange={(e) => onModelChange(e.target.value)}
              className="h-4 w-4 border-border"
            />
            <label htmlFor={model.id} className="flex items-center space-x-2">
              <ModelIcon modelId={model.id} className="h-4 w-4" />
              <span>{model.name}</span>
              <span className="text-xs text-muted-foreground">
                ({formatProviderName(model.provider)})
              </span>
            </label>
          </div>
        ))}

        {availableModels.length === 0 && (
          <div className="text-sm text-muted-foreground">
            No models available. Please add API keys in the APIs tab.
          </div>
        )}
      </div>
    </div>
  );
};