import React, { useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { ModelSelector, AVAILABLE_MODELS } from '../ModelSelector';

interface ModelsProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableProviders?: ('anthropic' | 'perplexity' | 'openai' | 'xai' | 'google')[];
}

export const Models: React.FC<ModelsProps> = ({
  selectedModel,
  onModelChange,
  availableProviders = []
}) => {
  // Handle model change
  const handleModelChange = (modelId: string) => {
    console.log('Models: Model change:', { from: selectedModel, to: modelId });
    onModelChange(modelId);
  };

  // Set default model when providers change
  useEffect(() => {
    if (availableProviders.length > 0) {
      // Find first available model
      const firstAvailableModel = AVAILABLE_MODELS.find(
        m => availableProviders.includes(m.provider)
      );
      
      if (firstAvailableModel) {
        // Only change if current model is not available
        const currentModelProvider = AVAILABLE_MODELS.find(m => m.id === selectedModel)?.provider;
        if (!currentModelProvider || !availableProviders.includes(currentModelProvider)) {
          console.log('Models: Setting default model:', firstAvailableModel.id);
          handleModelChange(firstAvailableModel.id);
        }
      }
    }
  }, [availableProviders, selectedModel]);

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm mb-2 block">Model Selection</Label>
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={handleModelChange}
          availableProviders={availableProviders}
          disabled={availableProviders.length === 0}
        />
      </div>
      
      {availableProviders.length === 0 ? (
        <p className="text-sm text-muted-foreground mt-2">
          No API keys configured. Add API keys in the APIs tab to see available models.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground mt-2">
          Select your preferred model from the available providers.
        </p>
      )}
    </div>
  );
}; 