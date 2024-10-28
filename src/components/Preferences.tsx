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
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface PreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeys {
  anthropic: string;
  perplexity: string;
}

export const Preferences: React.FC<PreferencesProps> = ({ isOpen, onClose }) => {
  const [keys, setKeys] = useState<ApiKeys>({ anthropic: '', perplexity: '' });
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<{
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
  }>({
    anthropic: 'idle',
    perplexity: 'idle'
  });

  useEffect(() => {
    if (isOpen) {
      invoke<ApiKeys>('get_api_keys').then((savedKeys) => {
        setKeys(savedKeys);
        // Don't verify on load - wait for changes
      }).catch(err => {
        setError('Failed to load API keys');
        console.error(err);
      });
    } else {
      setVerificationStatus({ anthropic: 'idle', perplexity: 'idle' });
      setError(null);
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
      // Send only the key being verified
      const response = await invoke<{ error?: string }>('verify_api_key', { 
        key,
        provider: type
      });

      if (response.error) {
        setVerificationStatus(prev => ({ ...prev, [type]: 'error' }));
        setError(`Invalid ${type} API key`);
      } else {
        setVerificationStatus(prev => ({ ...prev, [type]: 'success' }));
      }
    } catch (err) {
      setVerificationStatus(prev => ({ ...prev, [type]: 'error' }));
      setError(`Failed to verify ${type} API key`);
      console.error(err);
    }
  };

  const handleKeyChange = (type: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [type]: value }));
    setVerificationStatus(prev => ({ ...prev, [type]: 'idle' }));
    setError(null);
    
    // Use a debounce to verify after typing stops
    const timeoutId = setTimeout(() => {
      verifyKey(type, value);
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // Only verify keys that have been changed and have a value
      const verifyPromises: Promise<void>[] = [];
      
      Object.entries(keys).forEach(([type, value]) => {
        if (value && verificationStatus[type as keyof ApiKeys] === 'idle') {
          verifyPromises.push(verifyKey(type as keyof ApiKeys, value));
        }
      });

      await Promise.all(verifyPromises);
      
      // Check if any verifications failed
      if (!Object.values(verificationStatus).some(status => status === 'error')) {
        await invoke('set_api_keys', { 
          anthropic: keys.anthropic || null,
          perplexity: keys.perplexity || null
        });
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
      <Label htmlFor={`${type}Key`} className="text-sm">{label}</Label>
      <div className="relative">
        <Input
          id={`${type}Key`}
          type="password"
          value={keys[type]}
          onChange={(e) => handleKeyChange(type, e.target.value)}
          placeholder={`Enter your ${type == "anthropic" ? "Anthropic" : "Perplexity"} API key`}
          className="rounded-sm text-sm pr-8"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {getVerificationIcon(verificationStatus[type])}
        </div>
      </div>
      {verificationStatus[type] === 'success' && (
        <p className="text-sm text-green-600">API key verified successfully</p>
      )}
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-sm bg-background">
        <DialogHeader>
          <DialogTitle className="text-sm">Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {renderApiKeyInput('anthropic', 'Anthropic API Key')}
          <Separator className="my-4 dark:bg-border" />
          {renderApiKeyInput('perplexity', 'Perplexity API Key')}

          {error && (
            <Alert variant="destructive" className="rounded-sm">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
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
      </DialogContent>
    </Dialog>
  );
};
