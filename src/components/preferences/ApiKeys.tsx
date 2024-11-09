import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeysProps {
  keys: {
    anthropic: string;
    perplexity: string;
    openai: string;
    xai: string;
    google: string;
  };
  verificationStatus: {
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
    openai: VerificationStatus;
    xai: VerificationStatus;
    google: VerificationStatus;
  };
  error: string | null;
  onKeyChange: (type: keyof typeof keys, value: string) => void;
}

const StatusIcon = ({ status }: { status: VerificationStatus }) => {
  switch (status) {
    case 'verifying':
      return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
    case 'success':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return null;
  }
};

export const ApiKeys: React.FC<ApiKeysProps> = ({
  keys,
  verificationStatus,
  error,
  onKeyChange,
}) => {
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="anthropic-key">Anthropic API Key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="anthropic-key"
              type="password"
              value={keys.anthropic}
              onChange={(e) => onKeyChange('anthropic', e.target.value)}
              placeholder="sk-ant-api03-..."
              className="font-mono text-sm"
            />
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.anthropic} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="perplexity-key">Perplexity API Key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="perplexity-key"
              type="password"
              value={keys.perplexity}
              onChange={(e) => onKeyChange('perplexity', e.target.value)}
              placeholder="pplx-..."
              className="font-mono text-sm"
            />
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.perplexity} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="openai-key">OpenAI API Key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="openai-key"
              type="password"
              value={keys.openai}
              onChange={(e) => onKeyChange('openai', e.target.value)}
              placeholder="sk-..."
              className="font-mono text-sm"
            />
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.openai} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="xai-key">xAI/Grok API Key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="xai-key"
              type="password"
              value={keys.xai}
              onChange={(e) => onKeyChange('xai', e.target.value)}
              placeholder="xai-..."
              className="font-mono text-sm"
            />
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.xai} />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="google-key">Google AI API Key</Label>
          <div className="flex items-center gap-2">
            <Input
              id="google-key"
              type="password"
              value={keys.google}
              onChange={(e) => onKeyChange('google', e.target.value)}
              placeholder="AIza..."
              className="font-mono text-sm"
            />
            <div className="flex-shrink-0">
              <StatusIcon status={verificationStatus.google} />
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