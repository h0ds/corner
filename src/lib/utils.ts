import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const formatProviderName = (provider: string): string => {
  const providerMap: Record<string, string> = {
    'openai': 'OpenAI',
    'anthropic': 'Anthropic',
    'perplexity': 'Perplexity',
    'xai': 'xAI',
    'google': 'Google AI',
    'elevenlabs': 'ElevenLabs'
  };

  return providerMap[provider] || provider;
};

export function sanitizeCssVar(name: string): string {
  return name.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
}
