import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface Model {
  id: string;
  name: string;
  provider: 'anthropic' | 'perplexity';
}

export const AVAILABLE_MODELS: Model[] = [
  // Anthropic Models
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  
  // Perplexity Models
  { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-medium-128k-online', name: 'Sonar Medium', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large', provider: 'perplexity' },
  { id: 'mixtral-8x7b-instruct', name: 'Mixtral 8x7B', provider: 'perplexity' },
  { id: 'mistral-7b-instruct', name: 'Mistral 7B', provider: 'perplexity' },
  { id: 'codellama-34b-instruct', name: 'CodeLlama 34B', provider: 'perplexity' },
  { id: 'pplx-7b-online', name: 'PPLX 7B', provider: 'perplexity' },
  { id: 'pplx-70b-online', name: 'PPLX 70B', provider: 'perplexity' },
];

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onModelChange,
  disabled
}) => {
  // Group models by provider
  const anthropicModels = AVAILABLE_MODELS.filter(m => m.provider === 'anthropic');
  const perplexityModels = AVAILABLE_MODELS.filter(m => m.provider === 'perplexity');

  return (
    <Select
      value={selectedModel}
      onValueChange={onModelChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px] rounded-sm text-sm">
        <SelectValue placeholder="Select a model" />
      </SelectTrigger>
      <SelectContent>
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Anthropic
        </div>
        {anthropicModels.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="text-sm"
          >
            {model.name}
          </SelectItem>
        ))}
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground mt-2">
          Perplexity
        </div>
        {perplexityModels.map((model) => (
          <SelectItem
            key={model.id}
            value={model.id}
            className="text-sm"
          >
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
