import React from 'react';
import { Label } from "@/components/ui/label";
import { ModelSelector, AVAILABLE_MODELS } from '../ModelSelector';
import { ApiKeys } from '@/types';

interface ModelsProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  apiKeys: ApiKeys;
}

export const Models: React.FC<ModelsProps> = ({
  selectedModel,
  onModelChange,
  apiKeys
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Default Model</Label>
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          disabled={false}
          apiKeys={apiKeys}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        This model will be used by default for new conversations.
      </p>
    </div>
  );
}; 