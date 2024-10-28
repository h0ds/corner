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

interface PreferencesProps {
  isOpen: boolean;
  onClose: () => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

export const Preferences: React.FC<PreferencesProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');

  useEffect(() => {
    if (isOpen) {
      invoke('get_api_key').then((key: string) => {
        setApiKey(key);
        if (key) {
          verifyApiKey(key);
        }
      }).catch(err => {
        setError('Failed to load API key');
        console.error(err);
      });
    } else {
      // Reset states when dialog closes
      setVerificationStatus('idle');
      setError(null);
    }
  }, [isOpen]);

  const verifyApiKey = async (key: string) => {
    setVerificationStatus('verifying');
    setError(null);

    try {
      // Send a test message to verify the API key
      const response = await invoke<{ error?: string }>('send_message', { 
        message: 'Test connection' 
      });

      if (response.error) {
        setVerificationStatus('error');
        setError('Invalid API key');
      } else {
        setVerificationStatus('success');
      }
    } catch (err) {
      setVerificationStatus('error');
      setError('Failed to verify API key');
      console.error(err);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      await verifyApiKey(apiKey);
      
      if (verificationStatus === 'success') {
        await invoke('set_api_key', { apiKey });
        onClose();
      }
    } catch (err) {
      setError('Failed to save API key');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const getVerificationIcon = () => {
    switch (verificationStatus) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="rounded-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">Preferences</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="text-sm">Anthropic API Key</Label>
            <div className="relative">
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setVerificationStatus('idle');
                  setError(null);
                }}
                placeholder="Enter your API key"
                className="rounded-sm text-sm pr-8"
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                {getVerificationIcon()}
              </div>
            </div>
            {verificationStatus === 'success' && (
              <p className="text-sm text-green-600">API key verified successfully</p>
            )}
          </div>

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
            disabled={isSaving || !apiKey.trim() || verificationStatus === 'verifying'}
            className="rounded-sm text-sm"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
