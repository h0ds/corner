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
  provider: 'anthropic' | 'perplexity' | 'openai';
}

export const AVAILABLE_MODELS: Model[] = [
  // Anthropic Models
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', provider: 'anthropic' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic' },
  
  // OpenAI Models
  { id: 'gpt-4-turbo-preview', name: 'GPT-4 Turbo', provider: 'openai' },
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai' },
  
  // Perplexity Sonar Models
  { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online (8B)', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online (70B)', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-huge-128k-online', name: 'Sonar Huge Online (405B)', provider: 'perplexity' },
  
  // Perplexity Chat Models
  { id: 'llama-3.1-sonar-small-128k-chat', name: 'Sonar Small Chat (8B)', provider: 'perplexity' },
  { id: 'llama-3.1-sonar-large-128k-chat', name: 'Sonar Large Chat (70B)', provider: 'perplexity' },
  
  // Perplexity Open Source Models
  { id: 'llama-3.1-8b-instruct', name: 'Llama 3.1 8B', provider: 'perplexity' },
  { id: 'llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'perplexity' }
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
  const openaiModels = AVAILABLE_MODELS.filter(m => m.provider === 'openai');
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
          OpenAI
        </div>
        {openaiModels.map((model) => (
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
