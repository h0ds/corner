import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeysProps {
  keys: {
    anthropic: string;
    perplexity: string;
    openai: string;
  };
  verificationStatus: {
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
    openai: VerificationStatus;
  };
  error: string | null;
  onKeyChange: (type: 'anthropic' | 'perplexity' | 'openai', value: string) => void;
}

const getVerificationIcon = (status: VerificationStatus) => {
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
  const renderApiKeyInput = (type: keyof typeof keys, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={`${type}Key`} className="text-sm text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`${type}Key`}
          type="password"
          value={keys[type]}
          onChange={(e) => onKeyChange(type, e.target.value)}
          placeholder={`Enter your ${
            type === 'anthropic' ? 'Anthropic' :
            type === 'perplexity' ? 'Perplexity' :
            'OpenAI'
          } API key`}
          className="rounded-sm text-sm pr-8 bg-background"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {getVerificationIcon(verificationStatus[type])}
        </div>
      </div>
      {verificationStatus[type] === 'error' && error && (
        <div className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono 
                      max-h-[100px] overflow-y-auto rounded-sm border border-red-200 
                      dark:border-red-900 p-2 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderApiKeyInput('anthropic', 'Anthropic API Key')}
      <div className="my-4" />
      {renderApiKeyInput('perplexity', 'Perplexity API Key')}
      <div className="my-4" />
      {renderApiKeyInput('openai', 'OpenAI API Key')}
    </div>
  );
}; 