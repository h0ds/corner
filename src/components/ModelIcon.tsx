import { AVAILABLE_MODELS } from './ModelSelector';
import { OpenAIIcon } from './icons/OpenAIIcon';
import { ClaudeIcon } from './icons/ClaudeIcon';
import { PerplexityIcon } from './icons/PerplexityIcon';

interface ModelIconProps {
  modelId: string;
  className?: string;
}

export const ModelIcon: React.FC<ModelIconProps> = ({ modelId, className }) => {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  
  switch (model?.provider) {
    case 'anthropic':
      return <ClaudeIcon className={className} />;
    case 'perplexity':
      return <PerplexityIcon className={className} />;
    case 'openai':
      return <OpenAIIcon className={className} />;
    default:
      return null;
  }
}; 