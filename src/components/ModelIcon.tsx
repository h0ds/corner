import React from 'react';
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
  // Log the exact modelId being passed
  console.log('ModelIcon received modelId:', modelId);

  // Function to match model providers more flexibly
  const getProviderIcon = (id: string) => {
    const lowerId = id.toLowerCase();
    
    // OpenAI matching
    if (lowerId.includes('gpt')) {
      console.log('Matched OpenAI model:', id);
      return <OpenAIIcon className={className} />;
    }
    
    // Anthropic matching
    if (lowerId.includes('claude')) {
      console.log('Matched Anthropic model:', id);
      return <ClaudeIcon className={className} />;
    }
    
    // Perplexity matching
    if (lowerId.includes('llama') || lowerId.includes('sonar') || lowerId.includes('mixtral')) {
      console.log('Matched Perplexity model:', id);
      return <PerplexityIcon className={className} />;
    }
    
    // Google matching
    if (lowerId.includes('gemini')) {
      console.log('Matched Google model:', id);
      return <GoogleIcon className={className} />;
    }
    
    // XAI matching
    if (lowerId.includes('grok')) {
      console.log('Matched XAI model:', id);
      return <XAIIcon className={className} />;
    }

    // ElevenLabs matching - check for voice_id which is the format used in VoiceSettings
    if (lowerId.includes('elevenlabs') || lowerId.includes('voice_id')) {
      console.log('Matched ElevenLabs model:', id);
      return <ElevenLabsIcon className={className} />;
    }
    
    // Default fallback
    console.log('No specific icon match for:', id);
    return <Bot className={className} />;
  };

  return getProviderIcon(modelId);
};