import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ModelIcon } from '../ModelIcon';
import { AVAILABLE_MODELS } from '../ModelSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatProviderName } from '@/lib/utils';
import { cn } from '@/lib/utils';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeysProps {
  keys: {
    anthropic: string;
    perplexity: string;
    openai: string;
    xai: string;
    google: string;
    elevenlabs: string;
  };
  verificationStatus: {
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
    openai: VerificationStatus;
    xai: VerificationStatus;
    google: VerificationStatus;
    elevenlabs: VerificationStatus;
  };
  error: string | null;
  onKeyChange: (type: keyof ApiKeysProps['keys'], value: string) => void;
  onRetryVerification?: (type: keyof ApiKeysProps['keys']) => void;
}

const API_KEY_URLS = {
  anthropic: 'https://console.anthropic.com/account/keys',
  perplexity: 'https://www.perplexity.ai/settings/api',
  openai: 'https://platform.openai.com/api-keys',
  xai: 'https://grok.x.ai',
  google: 'https://makersuite.google.com/app/apikeys',
  elevenlabs: 'https://elevenlabs.io/subscription'
};

const StatusText = ({ 
  status, 
  onRetry 
}: { 
  status: VerificationStatus;
  onRetry?: () => void;
}) => {
  const baseStyles = "text-xs font-mono rounded-full px-2 py-0.5 flex items-center gap-1";
  
  switch (status) {
    case 'verifying':
      return <span className={`${baseStyles} bg-muted text-muted-foreground`}>
        <Loader2 className="h-3 w-3 animate-spin" /> verifying
      </span>;
    case 'success':
      return <span className={`${baseStyles} bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400`}>
        configured
      </span>;
    case 'error':
      return <span className={`${baseStyles} bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 group`}>
        failed
        {onRetry && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={onRetry}
          >
            <XCircle className="h-3 w-3" />
            <span className="sr-only">Retry verification</span>
          </Button>
        )}
      </span>;
    default:
      return null;
  }
};

export const ApiKeys = ({
  keys,
  verificationStatus,
  error,
  onKeyChange,
  onRetryVerification
}: ApiKeysProps) => {
  // Track visibility state for each key
  const [visibility, setVisibility] = useState({
    anthropic: false,
    perplexity: false,
    openai: false,
    xai: false,
    google: false,
    elevenlabs: false
  });

  // Get first model ID for each provider
  const getProviderModelId = (provider: string) => {
    const model = AVAILABLE_MODELS.find(m => m.provider === provider);
    return model?.id;
  };

  // Show configured providers at the top
  const configuredProviders = Object.entries(keys)
    .filter(([provider, key]) => {
      return key && key.trim().length > 0;
    })
    .map(([provider]) => provider);

  // Get model IDs for each provider
  const providerModelMap = Object.fromEntries(
    AVAILABLE_MODELS.reduce((acc, model) => {
      if (!acc.some(m => m[0] === model.provider)) {
        acc.push([model.provider, model.id]);
      }
      return acc;
    }, [] as [string, string][])
  );

  // Toggle visibility for a specific provider
  const toggleVisibility = (provider: keyof typeof visibility) => {
    setVisibility(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-destructive mb-4">
          {error.includes('overloaded') ? 
            'The API is currently experiencing high load. Please try again in a moment.' : 
            error
          }
        </div>
      )}
      
      {/* Configured Providers */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Active Models</h2>
        {configuredProviders.length > 0 ? (
          <div className="flex gap-2 items-center h-8">
            {configuredProviders.map(provider => {
              const modelId = providerModelMap[provider];
              const isVerified = verificationStatus[provider as keyof typeof verificationStatus] === 'success';
              
              return (
                <TooltipProvider key={provider}>
                  <Tooltip>
                    <TooltipTrigger>
                      <div 
                        className={cn(
                          "p-1.5 rounded-md transition-colors",
                          isVerified ? "bg-accent" : "bg-accent/50"
                        )}
                      >
                        <ModelIcon 
                          modelId={modelId} 
                          className={cn(
                            "h-4 w-4",
                            !isVerified && "opacity-50"
                          )} 
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {formatProviderName(provider)}
                        {!isVerified && " (Unverified)"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No models enabled yet</div>
        )}
      </div>

      <div className="space-y-4">
        {/* API Key Inputs */}
        <h2 className="text-lg font-medium">Configure API keys</h2>
        {Object.entries(keys).map(([provider, value]) => (
          <div key={provider} className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor={provider} className="flex items-center gap-2">
                <ModelIcon 
                  modelId={providerModelMap[provider]} 
                  className="h-4 w-4" 
                />
                {formatProviderName(provider)}
              </Label>
              <StatusText
                status={verificationStatus[provider as keyof typeof verificationStatus]}
                onRetry={() => onRetryVerification?.(provider as keyof ApiKeysProps['keys'])}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Input
                type={visibility[provider as keyof typeof visibility] ? "text" : "password"}
                id={provider}
                value={value || ""}
                onChange={(e) => {
                  const newValue = e.target.value;
                  onKeyChange(provider as keyof ApiKeysProps['keys'], newValue);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && value === '') {
                    onKeyChange(provider as keyof ApiKeysProps['keys'], '');
                  }
                }}
                placeholder={`Enter ${formatProviderName(provider)} API key`}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleVisibility(provider as keyof typeof visibility)}
                className="text-xs font-mono text-muted-foreground hover:text-foreground"
              >
                {visibility[provider as keyof typeof visibility] ? "hide" : "show"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};