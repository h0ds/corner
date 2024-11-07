import React from 'react';
import { Label } from "@/components/ui/label";
import { ModelSelector } from '../ModelSelector';

interface ModelsProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const Models: React.FC<ModelsProps> = ({
  selectedModel,
  onModelChange,
}) => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm mb-2 block">Frontier/Foundation Model</Label>
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={onModelChange}
          disabled={false}
        />
      </div>
    </div>
  );
}; 