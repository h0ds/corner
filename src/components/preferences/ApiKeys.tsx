import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, Info } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ModelIcon } from '../ModelIcon';
import { AVAILABLE_MODELS } from '../ModelSelector';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatProviderName } from '@/lib/utils';

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

const StatusIcon = ({ 
  status, 
  provider,
  onRetry 
}: { 
  status: VerificationStatus;
  provider: keyof typeof API_KEY_URLS;
  onRetry?: () => void;
}) => {
  switch (status) {
    case 'verifying':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive"
                onClick={onRetry}
              >
                <XCircle className="h-4 w-4" />
                <span className="sr-only">Retry verification</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Retry verification
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    default:
      return (
        <a 
          href={API_KEY_URLS[provider]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors"
          title={`Get ${provider} API key`}
        >
          <Info className="h-4 w-4" />
        </a>
      );
  }
};

export const ApiKeys: React.FC<ApiKeysProps> = ({
  keys,
  verificationStatus,
  error,
  onKeyChange,
  onRetryVerification
}) => {
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
    return AVAILABLE_MODELS.find(m => m.provider === provider)?.id;
  };

  // Show configured providers at the top
  const configuredProviders = Object.entries(verificationStatus)
    .filter(([_, status]) => status === 'success')
    .map(([provider]) => provider);

  // Toggle visibility for a specific provider
  const toggleVisibility = (provider: keyof typeof visibility) => {
    setVisibility(prev => ({
      ...prev,
      [provider]: !prev[provider]
    }));
  };

  return (
    <div className="space-y-4">
      
      {/* Configured Providers */}
      <div className="space-y-2">
        <Label>Enabled Models</Label>
        {configuredProviders.length > 0 ? (
          <div className="flex gap-2 items-center h-8">
            {configuredProviders.map(provider => (
              <TooltipProvider key={provider}>
                <Tooltip>
                  <TooltipTrigger>
                    <div 
                      className="p-1.5 bg-accent rounded-md"
                    >
                      <ModelIcon 
                        modelId={getProviderModelId(provider) || ''} 
                        className="h-4 w-4" 
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{formatProviderName(provider)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No models enabled yet</div>
        )}
      </div>

      <div className="space-y-4">
        <Label>Available Models</Label>
        <div className="space-y-2">
          <Label htmlFor="anthropic-key">Anthropic API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="anthropic-key"
                type={visibility.anthropic ? "text" : "password"}
                value={keys.anthropic}
                onChange={(e) => onKeyChange('anthropic', e.target.value)}
                placeholder="sk-ant-api03-..."
                className="font-mono text-sm pr-20"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <div className="flex-shrink-0">
                  <StatusIcon 
                    status={verificationStatus.anthropic} 
                    provider="anthropic"
                    onRetry={() => onRetryVerification?.('anthropic')}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => toggleVisibility('anthropic')}
                >
                  {visibility.anthropic ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="perplexity-key">Perplexity API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="perplexity-key"
                type={visibility.perplexity ? "text" : "password"}
                value={keys.perplexity}
                onChange={(e) => onKeyChange('perplexity', e.target.value)}
                placeholder="pplx-..."
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => toggleVisibility('perplexity')}
              >
                {visibility.perplexity ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.perplexity} provider="perplexity" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-key">OpenAI API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="openai-key"
                type={visibility.openai ? "text" : "password"}
                value={keys.openai}
                onChange={(e) => onKeyChange('openai', e.target.value)}
                placeholder="sk-..."
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => toggleVisibility('openai')}
              >
                {visibility.openai ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.openai} provider="openai" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="xai-key">xAI/Grok API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="xai-key"
                type={visibility.xai ? "text" : "password"}
                value={keys.xai}
                onChange={(e) => onKeyChange('xai', e.target.value)}
                placeholder="xai-..."
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => toggleVisibility('xai')}
              >
                {visibility.xai ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.xai} provider="xai" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="google-key">Google AI/Gemini API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="google-key"
                type={visibility.google ? "text" : "password"}
                value={keys.google}
                onChange={(e) => onKeyChange('google', e.target.value)}
                placeholder="AIza..."
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => toggleVisibility('google')}
              >
                {visibility.google ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.google} provider="google" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="elevenlabs-key">ElevenLabs API Key</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                id="elevenlabs-key"
                type={visibility.elevenlabs ? "text" : "password"}
                value={keys.elevenlabs}
                onChange={(e) => onKeyChange('elevenlabs', e.target.value)}
                placeholder="your-elevenlabs-api-key..."
                className="font-mono text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => toggleVisibility('elevenlabs')}
              >
                {visibility.elevenlabs ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.elevenlabs} provider="elevenlabs" />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="select-text">
          <AlertDescription className="text-sm whitespace-pre-wrap font-mono">
            {error}
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Your API keys are stored locally and never sent to any server other than the respective API providers.
      </p>
    </div>
  );
}; 