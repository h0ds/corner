import { AVAILABLE_MODELS } from '../ModelSelector';
import { ModelIcon } from '../ModelIcon';
import { formatProviderName } from '@/lib/utils';
import { ApiKeys } from '@/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ModelsProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  availableProviders: string[];
  apiKeys: ApiKeys;
}

export const Models = ({ selectedModel, onModelChange, availableProviders, apiKeys }: ModelsProps) => {
  const availableModels = AVAILABLE_MODELS.filter(model => {
    const hasKey = apiKeys[model.provider] && apiKeys[model.provider].length > 0;
    return hasKey;
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Models</h3>
        <p className="text-sm text-muted-foreground">
          Select which model to use for chat. Only models from providers with valid API keys are shown.
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
                {/* <ModelIcon modelId={selectedModel} className="h-4 w-4" /> */}
                <SelectValue placeholder="Select a model" />
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
            No models available. Please add API keys in the APIs tab.
          </div>
        )}
      </div>
    </div>
  );
};