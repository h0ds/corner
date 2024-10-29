import { Bot } from "lucide-react";

interface ModelIconProps {
  modelId: string;
  className?: string;
}

export function ModelIcon({ modelId, className }: ModelIconProps) {
  // Map model IDs to their respective icons
  switch (modelId) {
    case 'claude-3-opus-20240229':
    case 'claude-3-sonnet-20240229':
    case 'claude-3-haiku-20240307':
      return (
        <svg 
          className={className} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 3L4 7V17L12 21L20 17V7L12 3Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <path 
            d="M12 21V11M4 7L12 11L20 7" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'mixtral-8x7b-instruct':
    case 'pplx-7b-online':
    case 'pplx-70b-online':
      return (
        <svg 
          className={className} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 8L15 13.2L18 10.5L17 17H7L6 10.5L9 13.2L12 8Z" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
          <circle 
            cx="12" 
            cy="12" 
            r="9" 
            stroke="currentColor" 
            strokeWidth="2"
          />
        </svg>
      );
    default:
      return <Bot className={className} />;
  }
} 