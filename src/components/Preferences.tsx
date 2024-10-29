import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, KeyRound, Palette, Bot } from "lucide-react";
import { ThemeToggle } from './ThemeToggle';
import { ModelSelector } from './ModelSelector';
import { cn } from '@/lib/utils';
import { loadApiKeys } from '@/lib/apiKeys';

interface PreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeys {
  anthropic: string;
  perplexity: string;
}

type PreferenceTab = 'api-keys' | 'appearance' | 'models';

export const Preferences: React.FC<PreferencesProps> = ({ 
  isOpen, 
  onClose,
  selectedModel,
  onModelChange
}) => {
  const [keys, setKeys] = useState<ApiKeys>({ anthropic: '', perplexity: '' });
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PreferenceTab>('api-keys');
  const [verificationStatus, setVerificationStatus] = useState<{
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
  }>({
    anthropic: 'idle',
    perplexity: 'idle'
  });

  useEffect(() => {
    if (isOpen) {
      invoke<{ anthropic: string | null; perplexity: string | null }>('get_api_keys')
        .then((storedKeys) => {
          console.log('Loaded stored keys:', {
            anthropic: storedKeys.anthropic ? '***' : 'none',
            perplexity: storedKeys.perplexity ? '***' : 'none'
          });
          
          setKeys({
            anthropic: storedKeys.anthropic || '',
            perplexity: storedKeys.perplexity || ''
          });

          setVerificationStatus(prev => ({
            anthropic: storedKeys.anthropic ? 'success' : prev.anthropic,
            perplexity: storedKeys.perplexity ? 'success' : prev.perplexity
          }));
        })
        .catch(err => {
          console.error('Failed to load API keys:', err);
          setError('Failed to load stored API keys');
        });
    }
  }, [isOpen]);

  const verifyKey = async (type: keyof ApiKeys, key: string) => {
    if (!key.trim()) {
      setVerificationStatus(prev => ({ ...prev, [type]: 'idle' }));
      return;
    }

    setVerificationStatus(prev => ({ ...prev, [type]: 'verifying' }));
    setError(null);

    try {
      const response = await invoke<{ error?: string }>('verify_api_key', { 
        request: { 
          key,
          provider: type
        }
      });

      if (response.error) {
        setVerificationStatus(prev => ({ ...prev, [type]: 'error' }));
        const formattedError = response.error
          .split('\n')
          .map(line => line.trim())
          .filter(Boolean)
          .join('\n');
        setError(formattedError);
        
        console.error('API Key Verification Error:', {
          provider: type,
          error: response.error,
          keyPrefix: key.slice(0, 10) + '...'
        });
      } else {
        setVerificationStatus(prev => ({ ...prev, [type]: 'success' }));
      }
    } catch (err) {
      setVerificationStatus(prev => ({ ...prev, [type]: 'error' }));
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Failed to verify ${type} API key: ${errorMessage}`);
      console.error('API Key Verification Error:', {
        provider: type,
        error: err,
        keyPrefix: key.slice(0, 10) + '...'
      });
    }
  };

  const handleKeyChange = (type: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [type]: value }));
    setVerificationStatus(prev => ({ ...prev, [type]: 'idle' }));
    setError(null);
    
    const timeoutId = setTimeout(() => {
      verifyKey(type, value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await invoke('set_api_keys', { 
        anthropic: keys.anthropic || null,
        perplexity: keys.perplexity || null,
      });

      const verifyPromises: Promise<void>[] = [];
      Object.entries(keys).forEach(([type, value]) => {
        if (value && verificationStatus[type as keyof ApiKeys] === 'idle') {
          verifyPromises.push(verifyKey(type as keyof ApiKeys, value));
        }
      });

      await Promise.all(verifyPromises);
      
      if (!Object.values(verificationStatus).some(status => status === 'error')) {
        onClose();
      }
    } catch (err) {
      setError('Failed to save API keys');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getVerificationIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'verifying':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const renderApiKeyInput = (type: keyof ApiKeys, label: string) => (
    <div className="space-y-2">
      <Label htmlFor={`${type}Key`} className="text-sm text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`${type}Key`}
          type="password"
          value={keys[type]}
          onChange={(e) => handleKeyChange(type, e.target.value)}
          placeholder={`Enter your ${type} API key`}
          className="rounded-sm text-sm pr-8 bg-background"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {getVerificationIcon(verificationStatus[type])}
        </div>
      </div>
      {verificationStatus[type] === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">
          API key verified successfully
        </p>
      )}
      {verificationStatus[type] === 'error' && error && (
        <div className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono">
          {error}
        </div>
      )}
    </div>
  );

  const tabs: { id: PreferenceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'api-keys', label: 'APIs', icon: <KeyRound className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'models', label: 'Models', icon: <Bot className="h-4 w-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'api-keys':
        return (
          <div className="space-y-4">
            {renderApiKeyInput('anthropic', 'Anthropic API Key')}
            <div className="my-4" />
            {renderApiKeyInput('perplexity', 'Perplexity API Key')}
          </div>
        );
      case 'appearance':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Theme</Label>
              <ThemeToggle />
            </div>
          </div>
        );
      case 'models':
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-sm mb-2 block">Foundation Model</Label>
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                disabled={false}
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-sm bg-background border-border sm:max-w-[700px] p-0 gap-0">
        <div className="flex h-[500px]">
          {/* Sidebar */}
          <div className="w-[200px] border-r border-border p-2 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-sm",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  activeTab === tab.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <DialogHeader>
              <DialogTitle className="text-sm font-medium">
                {tabs.find(t => t.id === activeTab)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="mt-4">
              {renderContent()}
            </div>

            {error && (
              <Alert variant="destructive" className="rounded-sm mt-4">
                <AlertDescription className="text-sm">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {activeTab === 'api-keys' && (
              <DialogFooter className="gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={onClose}
                  className="rounded-sm text-sm"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave} 
                  disabled={isSaving || 
                    (!keys.anthropic && !keys.perplexity) || 
                    verificationStatus.anthropic === 'verifying' || 
                    verificationStatus.perplexity === 'verifying'}
                  className="rounded-sm text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
