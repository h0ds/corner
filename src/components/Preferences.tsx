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
import { Loader2, CheckCircle2, XCircle, KeyRound, Palette, Bot, Keyboard, RotateCcw } from "lucide-react";
import { ThemeToggle } from './ThemeToggle';
import { ModelSelector } from './ModelSelector';
import { cn } from '@/lib/utils';
import { loadApiKeys } from '@/lib/apiKeys';
import { KeyboardShortcut, DEFAULT_SHORTCUTS, loadShortcuts, saveShortcuts, resetShortcuts } from '@/lib/shortcuts';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface PreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  initialTab?: PreferenceTab;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeys {
  anthropic: string;
  perplexity: string;
}

type PreferenceTab = 'api-keys' | 'appearance' | 'models' | 'shortcuts';

export const Preferences: React.FC<PreferencesProps> = ({ 
  isOpen, 
  onClose,
  selectedModel,
  onModelChange,
  initialTab = 'api-keys'
}) => {
  const [keys, setKeys] = useState<ApiKeys>({ anthropic: '', perplexity: '' });
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);
  const [verificationStatus, setVerificationStatus] = useState<{
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
  }>({
    anthropic: 'idle',
    perplexity: 'idle'
  });
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [recordingShortcut, setRecordingShortcut] = useState(false);

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

  useEffect(() => {
    if (isOpen && activeTab === 'shortcuts') {
      const loadShortcutsData = async () => {
        const shortcuts = await loadShortcuts();
        setShortcuts(shortcuts);
      };
      loadShortcutsData();
    }
  }, [isOpen, activeTab]);

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
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="h-4 w-4" /> },
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
      case 'shortcuts':
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const reset = resetShortcuts();
                  setShortcuts(reset);
                }}
                className="text-xs"
              >
                Reset to Defaults
              </Button>
            </div>
            {shortcuts.map((shortcut) => (
              <div
                key={shortcut.id}
                className="flex items-center justify-between p-3 rounded-sm bg-muted"
              >
                <span className="text-sm">{shortcut.description}</span>
                <div className="flex items-center gap-2">
                  {editingShortcutId === shortcut.id ? (
                    <div className="px-2 py-1 text-xs bg-background rounded-sm border border-primary animate-pulse min-w-[200px] text-center">
                      {shortcuts.find(s => s.id === shortcut.id)?.currentKey || 'Press keys...'}
                      <span className="ml-2 text-muted-foreground">(Enter to save, Esc to cancel)</span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleShortcutChange(shortcut)}
                      className="text-xs h-7 px-2"
                    >
                      {shortcut.currentKey}
                    </Button>
                  )}
                  {shortcut.currentKey !== shortcut.defaultKey && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updated = shortcuts.map(s =>
                                s.id === shortcut.id ? { ...s, currentKey: s.defaultKey } : s
                              );
                              setShortcuts(updated);
                              saveShortcuts(updated);
                            }}
                            className="h-7 w-7 p-0"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Reset to default</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
    }
  };

  const handleShortcutChange = (shortcut: KeyboardShortcut) => {
    setRecordingShortcut(true);
    setEditingShortcutId(shortcut.id);
    let currentCombination: string[] = [];

    const handleKeyDown = (e: KeyboardEvent) => {
      // Stop event propagation and prevent default
      e.stopPropagation();
      e.preventDefault();

      // Handle Escape to cancel
      if (e.key === 'Escape') {
        setEditingShortcutId(null);
        setRecordingShortcut(false);
        window.removeEventListener('keydown', handleKeyDown);
        return;
      }

      // Build the key combination
      const modifiers = [];
      if (e.metaKey) modifiers.push('⌘');
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');

      // Get the main key, excluding modifier keys
      let mainKey = e.key;
      if (!['Meta', 'Control', 'Alt', 'Shift', 'Enter'].includes(mainKey)) {
        mainKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        currentCombination = [...modifiers, mainKey];

        // Show the current combination being recorded
        const updatedShortcuts = shortcuts.map(s => 
          s.id === shortcut.id ? { ...s, currentKey: currentCombination.join(' + ') } : s
        );
        setShortcuts(updatedShortcuts);
      }

      // Handle Enter to save
      if (e.key === 'Enter' && currentCombination.length > 0) {
        const newShortcut = currentCombination.join(' + ');
        const updatedShortcuts = shortcuts.map(s => 
          s.id === shortcut.id ? { ...s, currentKey: newShortcut } : s
        );
        setShortcuts(updatedShortcuts);
        saveShortcuts(updatedShortcuts);
        setEditingShortcutId(null);
        setRecordingShortcut(false);
        window.removeEventListener('keydown', handleKeyDown);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        if (!editingShortcutId) {
          onClose();
        }
      }}
    >
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
