import { Bot } from "lucide-react";
import ClaudeIcon from '@/assets/icons/claude-ai-icon.svg';
import PerplexityIcon from '@/assets/icons/perplexity-ai-icon.svg';

interface ModelIconProps {
  modelId: string;
  className?: string;
}

export function ModelIcon({ modelId, className }: ModelIconProps) {
  // Get provider from model ID
  const isAnthropic = modelId.includes('claude');
  const isPerplexity = modelId.includes('llama') || modelId.includes('sonar') || modelId.includes('pplx');

  // Return the appropriate icon
  if (isAnthropic) {
    return (
      <img 
        src={ClaudeIcon} 
        className={className}
        alt="Claude AI"
      />
    );
  }

  if (isPerplexity) {
    return (
      <img 
        src={PerplexityIcon} 
        className={className}
        alt="Perplexity AI"
      />
    );
  }

  // Fallback to default bot icon
  return <Bot className={className} />;
} 