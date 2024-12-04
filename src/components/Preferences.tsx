import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Palette, Bot, Keyboard, Network, Code, Zap, Volume2 } from "lucide-react";
import { cn } from '@/lib/utils';
import { KeyboardShortcut, loadShortcuts, saveShortcuts, resetShortcuts } from '@/lib/shortcuts';
import { Plugin } from '@/lib/plugins';
import { ApiKeys } from './preferences/ApiKeys';
import { Appearance } from './preferences/Appearance';
import { Models } from './preferences/Models';
import { Shortcuts } from './preferences/Shortcuts';
import { Connections } from './preferences/Connections';
import { Plugins } from './preferences/Plugins';
import { Actions, Action } from './preferences/Actions';
import { Storage } from './preferences/Storage';
import { Database } from 'lucide-react';
import { VoiceSettings } from './preferences/VoiceSettings';
import { showToast } from '@/lib/toast';

interface PreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  initialTab?: PreferenceTab;
  plugins?: Plugin[];
  onPluginChange?: (plugins: Plugin[]) => void;
  actions?: Action[];
  onActionsChange?: (actions: Action[]) => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeys {
  anthropic: string;
  perplexity: string;
  openai: string;
  xai: string;
  google: string;
  elevenlabs: string;
}

type PreferenceTab = 'api-keys' | 'appearance' | 'models' | 'shortcuts' | 'plugins' | 'connections' | 'actions' | 'storage' | 'voice';

export const Preferences: React.FC<PreferencesProps> = ({ 
  isOpen, 
  onClose,
  selectedModel,
  onModelChange,
  initialTab = 'api-keys',
  plugins = [],
  onPluginChange,
  actions = [],
  onActionsChange,
}) => {
  const [keys, setKeys] = useState<ApiKeys>({ 
    anthropic: '', 
    perplexity: '', 
    openai: '',
    xai: '',
    google: '',
    elevenlabs: ''
  });
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);
  const [verificationStatus, setVerificationStatus] = useState<{
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
    openai: VerificationStatus;
    xai: VerificationStatus;
    google: VerificationStatus;
    elevenlabs: VerificationStatus;
  }>({
    anthropic: 'idle',
    perplexity: 'idle',
    openai: 'idle',
    xai: 'idle',
    google: 'idle',
    elevenlabs: 'idle'
  });
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      invoke<{
        anthropic: string | null;
        perplexity: string | null;
        openai: string | null;
        xai: string | null;
        google: string | null;
        elevenlabs: string | null;
      }>('get_stored_api_keys')
        .then((storedKeys) => {
          console.log('Loaded stored keys:', {
            anthropic: storedKeys.anthropic ? '***' : 'none',
            perplexity: storedKeys.perplexity ? '***' : 'none',
            openai: storedKeys.openai ? '***' : 'none',
            xai: storedKeys.xai ? '***' : 'none',
            google: storedKeys.google ? '***' : 'none',
            elevenlabs: storedKeys.elevenlabs ? '***' : 'none'
          });
          setKeys({
            anthropic: storedKeys.anthropic || '',
            perplexity: storedKeys.perplexity || '',
            openai: storedKeys.openai || '',
            xai: storedKeys.xai || '',
            google: storedKeys.google || '',
            elevenlabs: storedKeys.elevenlabs || ''
          });
        })
        .catch((error) => {
          console.error('Failed to load API keys:', error);
          // Don't set error if we successfully loaded the keys
          if (!keys.anthropic && !keys.perplexity && !keys.openai && !keys.xai && !keys.google && !keys.elevenlabs) {
            setError('Failed to load API keys');
          }
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
      return;
    }

    setVerificationStatus(prev => ({
      ...prev,
      [type]: 'verifying'
    }));

    try {
      // Add a small random delay to prevent concurrent requests
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
      
      const result = await invoke<boolean>('verify_api_key', {
        provider: type,
        key: key.trim()
      });

      console.log(`Verification result for ${type}:`, result);

      setVerificationStatus(prev => ({
        ...prev,
        [type]: result ? 'success' : 'error'
      }));

      if (!result) {
        setError(`Failed to verify ${type} API key`);
      }
    } catch (err: any) {
      console.error(`Error verifying ${type} key:`, err);
      
      // Handle overloaded error specifically
      if (err.toString().includes('overloaded')) {
        setError('API is currently experiencing high load. Please try again in a moment.');
        setVerificationStatus(prev => ({
          ...prev,
          [type]: 'error'
        }));
        return;
      }

      setVerificationStatus(prev => ({
        ...prev,
        [type]: 'error'
      }));
      setError(err.toString());
    }
  };

  const handleKeyChange = (type: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [type]: value }));
    setVerificationStatus(prev => ({ ...prev, [type]: 'idle' }));
    setError(null);
    
    const timeoutId = setTimeout(() => {
      if (value.trim()) {
        verifyKey(type, value);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      console.log('Saving API keys:', keys);
      await invoke('set_api_keys', { 
        request: {
          anthropic: keys.anthropic || "",
          perplexity: keys.perplexity || "",
          openai: keys.openai || "",
          xai: keys.xai || "",
          google: keys.google || "",
          elevenlabs: keys.elevenlabs || "",
        }
      });
      
      showToast({
        title: "Success",
        description: "API keys saved successfully",
      });
      
      onClose();
    } catch (err) {
      console.error('Error saving API keys:', err);
      setError(err instanceof Error ? err.message : 'Failed to save API keys');
      showToast({
        title: "Error",
        description: "Failed to save API keys",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: PreferenceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'api-keys', label: 'APIs', icon: <KeyRound className="h-4 w-4" /> },
    { id: 'connections', label: 'Connections', icon: <Network className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'models', label: 'Models', icon: <Bot className="h-4 w-4" /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="h-4 w-4" /> },
    { id: 'plugins', label: 'Plugins', icon: <Code className="h-4 w-4" /> },
    { id: 'actions', label: 'Actions', icon: <Zap className="h-4 w-4" /> },
    { id: 'storage', label: 'Storage', icon: <Database className="h-4 w-4" /> },
    { id: 'voice', label: 'Voice', icon: <Volume2 className="h-4 w-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'api-keys':
        return (
          <ApiKeys
            keys={keys}
            verificationStatus={verificationStatus}
            error={error}
            onKeyChange={handleKeyChange}
            onRetryVerification={async (type) => {
              if (keys[type]) {
                const error = await verifyKey(type, keys[type]);
                if (error) {
                  setError(error);
                }
              }
            }}
          />
        );
      case 'appearance':
        return <Appearance />;
      case 'models':
        const availableProviders = Object.entries(verificationStatus)
          .filter(([_, status]) => status === 'success')
          .map(([provider]) => provider as 'anthropic' | 'perplexity' | 'openai' | 'xai' | 'google');

        return (
          <Models
            selectedModel={selectedModel}
            onModelChange={onModelChange}
            availableProviders={availableProviders}
            apiKeys={keys}
          />
        );
      case 'shortcuts':
        return (
          <Shortcuts
            shortcuts={shortcuts}
            editingShortcutId={editingShortcutId}
            onShortcutChange={handleShortcutChange}
            onReset={async () => {
              const reset = await resetShortcuts();
              setShortcuts(reset);
            }}
            onSave={saveShortcuts}
          />
        );
      case 'plugins':
        return (
          <Plugins
            plugins={plugins}
            onPluginChange={onPluginChange}
          />
        );
      case 'connections':
        return <Connections />;
      case 'actions':
        return (
          <Actions
            actions={actions}
            onActionChange={onActionsChange}
          />
        );
      case 'storage':
        return <Storage />;
      case 'voice':
        return (
          <VoiceSettings 
            apiKey={keys.elevenlabs}
          />
        );
      default:
        return null;
    }
  };

  const handleShortcutChange = (shortcut: KeyboardShortcut) => {
    setEditingShortcutId(shortcut.id);

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (e.key === 'Escape') {
        setEditingShortcutId(null);
        window.removeEventListener('keydown', handleKeyDown);
        return;
      }

      // Build the shortcut combination
      const parts: string[] = [];
      if (e.metaKey) parts.push('⌘');
      if (e.ctrlKey && !e.metaKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      // Only add the main key if it's not a modifier
      if (!['Meta', 'Control', 'Alt', 'Shift'].includes(e.key)) {
        // Capitalize single letters
        const mainKey = e.key.length === 1 ? e.key.toUpperCase() : e.key;
        parts.push(mainKey);

        // Update the shortcut
        const newShortcut = parts.join(' + ');
        const updatedShortcuts = shortcuts.map(s => 
          s.id === shortcut.id ? { ...s, currentKey: newShortcut } : s
        );

        setShortcuts(updatedShortcuts);
        saveShortcuts(updatedShortcuts);
        setEditingShortcutId(null);
        window.removeEventListener('keydown', handleKeyDown);
      }
    };

    // Add the event listener
    window.addEventListener('keydown', handleKeyDown);
  };

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={() => {
        if (!editingShortcutId) {
          onClose();
        }
      }}
    >
      <DialogContent className="rounded-xl bg-background border-border sm:max-w-[700px] p-0 gap-0">
        <div className="flex h-[500px]">
          <div className="w-[200px] border-r border-border p-2 space-y-1 shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm rounded-xl",
                  "hover:bg-accent hover:text-accent-foreground transition-colors",
                  activeTab === tab.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0">
            <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
              <DialogTitle className="text-md font-medium">
                {tabs.find(t => t.id === activeTab)?.label}
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-6">
              {renderContent()}

              {error && (
                <Alert variant="destructive" className="rounded-xl mt-4">
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
                    className="rounded-xl text-sm"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving || 
                      (!keys.anthropic && !keys.perplexity && !keys.openai && !keys.xai && !keys.google && !keys.elevenlabs) || 
                      verificationStatus.anthropic === 'verifying' || 
                      verificationStatus.perplexity === 'verifying' || 
                      verificationStatus.openai === 'verifying' || 
                      verificationStatus.xai === 'verifying' ||
                      verificationStatus.google === 'verifying' ||
                      verificationStatus.elevenlabs === 'verifying'}
                    className="rounded-xl text-sm"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
