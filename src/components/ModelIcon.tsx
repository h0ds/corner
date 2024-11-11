import { AVAILABLE_MODELS } from './ModelSelector';
import { OpenAIIcon } from './icons/OpenAIIcon';
import { ClaudeIcon } from './icons/ClaudeIcon';
import { PerplexityIcon } from './icons/PerplexityIcon';
import { XAIIcon } from './icons/XAIIcon';
import { GoogleIcon } from './icons/GoogleIcon';
import { ElevenLabsIcon } from './icons/ElevenLabsIcon';
import { Bot } from 'lucide-react';

interface ModelIconProps {
  modelId: string;
  className?: string;
}

export const ModelIcon: React.FC<ModelIconProps> = ({ modelId, className }) => {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  
  if (!model) {
    return <Bot className={className} />;
  }
  
  switch (model.provider) {
    case 'anthropic':
      return <ClaudeIcon className={className} />;
    case 'openai':
      return <OpenAIIcon className={className} />;
    case 'perplexity':
      return <PerplexityIcon className={className} />;
    case 'xai':
      return <XAIIcon className={className} />;
    case 'google':
      return <GoogleIcon className={className} />;
    case 'elevenlabs':
      return <ElevenLabsIcon className={className} />;
    default:
      return <Bot className={className} />;
  }
}; 