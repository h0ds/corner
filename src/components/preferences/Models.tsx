import React, { useEffect, useState } from 'react';
import { Label } from "@/components/ui/label";
import { ModelSelector, AVAILABLE_MODELS } from '../ModelSelector';
import { loadApiKeys } from '@/lib/apiKeys';
import { ApiKeys } from '@/types';

interface ModelsProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export const Models: React.FC<ModelsProps> = ({
  selectedModel,
  onModelChange
}) => {
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});

  useEffect(() => {
    const loadKeys = async () => {
      try {
        const keys = await loadApiKeys();
        setApiKeys(keys);
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    };

    loadKeys();
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Default Model</Label>
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          apiKeys={apiKeys}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        This model will be used by default for new conversations.
      </p>
    </div>
  );
}; 