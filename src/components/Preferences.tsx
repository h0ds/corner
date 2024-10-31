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
import { Loader2, CheckCircle2, XCircle, KeyRound, Palette, Bot, Keyboard, RotateCcw, Network } from "lucide-react";
import { ThemeToggle } from './ThemeToggle';
import { ModelSelector } from './ModelSelector';
import { cn } from '@/lib/utils';
import { loadApiKeys } from '@/lib/apiKeys';
import { KeyboardShortcut, DEFAULT_SHORTCUTS, loadShortcuts, saveShortcuts, resetShortcuts } from '@/lib/shortcuts';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Plugin, loadPlugins, savePlugin, deletePlugin, togglePlugin } from '@/lib/plugins';
import { nanoid } from 'nanoid';
import { Code, Pencil, Trash2 } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Plus } from 'lucide-react';
import { Search } from 'lucide-react';
import { FileText } from 'lucide-react';
import { PluginDocs } from './PluginDocs';
import { ApiKeys } from './preferences/ApiKeys';
import { Appearance } from './preferences/Appearance';
import { Models } from './preferences/Models';
import { Shortcuts } from './preferences/Shortcuts';
import { Connections } from './preferences/Connections';
import { Plugins } from './preferences/Plugins';

interface PreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  initialTab?: PreferenceTab;
  plugins?: Plugin[];
  onPluginChange?: (plugins: Plugin[]) => void;
}

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

interface ApiKeys {
  anthropic: string;
  perplexity: string;
  openai: string;
}

type PreferenceTab = 'api-keys' | 'appearance' | 'models' | 'shortcuts' | 'plugins' | 'connections';

export const Preferences: React.FC<PreferencesProps> = ({ 
  isOpen, 
  onClose,
  selectedModel,
  onModelChange,
  initialTab = 'api-keys',
  plugins = [],
  onPluginChange,
}) => {
  const [keys, setKeys] = useState<ApiKeys>({ 
    anthropic: '', 
    perplexity: '', 
    openai: '' 
  });
  const [isSaving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab);
  const [verificationStatus, setVerificationStatus] = useState<{
    anthropic: VerificationStatus;
    perplexity: VerificationStatus;
    openai: VerificationStatus;
  }>({
    anthropic: 'idle',
    perplexity: 'idle',
    openai: 'idle'
  });
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [recordingShortcut, setRecordingShortcut] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [pluginCode, setPluginCode] = useState('');
  const [showDocs, setShowDocs] = useState(false);

  // Update active tab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen) {
      invoke<{ anthropic: string | null; perplexity: string | null; openai: string | null }>('get_api_keys')
        .then((storedKeys) => {
          console.log('Loaded stored keys:', {
            anthropic: storedKeys.anthropic ? '***' : 'none',
            perplexity: storedKeys.perplexity ? '***' : 'none',
            openai: storedKeys.openai ? '***' : 'none'
          });
          
          setKeys({
            anthropic: storedKeys.anthropic || '',
            perplexity: storedKeys.perplexity || '',
            openai: storedKeys.openai || ''
          });

          setVerificationStatus(prev => ({
            anthropic: storedKeys.anthropic ? 'success' : prev.anthropic,
            perplexity: storedKeys.perplexity ? 'success' : prev.perplexity,
            openai: storedKeys.openai ? 'success' : prev.openai
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
        openai: keys.openai || null,
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
      {/* {verificationStatus[type] === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">
          API key verified successfully
        </p>
      )} */}
      {verificationStatus[type] === 'error' && error && (
        <div className="text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap font-mono 
                        max-h-[100px] overflow-y-auto rounded-sm border border-red-200 
                        dark:border-red-900 p-2 bg-red-50 dark:bg-red-900/20">
          {error}
        </div>
      )}
    </div>
  );

  const tabs: { id: PreferenceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'api-keys', label: 'APIs', icon: <KeyRound className="h-4 w-4" /> },
    { id: 'connections', label: 'Connections', icon: <Network className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'models', label: 'Models', icon: <Bot className="h-4 w-4" /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="h-4 w-4" /> },
    { id: 'plugins', label: 'Plugins', icon: <Code className="h-4 w-4" /> },
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
          />
        );
      case 'appearance':
        return <Appearance />;
      case 'models':
        return (
          <Models
            selectedModel={selectedModel}
            onModelChange={onModelChange}
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
      default:
        return null;
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

  const handleCreatePlugin = () => {
    const newPlugin: Plugin = {
      id: nanoid(),
      name: 'New Plugin',
      description: 'A new plugin',
      version: '1.0.0',
      author: '',
      enabled: false,
      code: `// Plugin code here
hooks: {
  onMessage: async (message) => {
    // Modify or process message here
    return message;
  },
  onThreadCreate: async (thread) => {
    // Modify or process new thread here
    return thread;
  }
}`,
      hooks: {}
    };
    setEditingPlugin(newPlugin);
    setPluginCode(newPlugin.code);
  };

  const handleSavePlugin = async () => {
    if (editingPlugin) {
      const updatedPlugin = {
        ...editingPlugin,
        code: pluginCode
      };
      await savePlugin(updatedPlugin);
      const newPlugins = await loadPlugins();
      onPluginChange?.(newPlugins);
      setEditingPlugin(null);
      setPluginCode('');
    }
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
                    (!keys.anthropic && !keys.perplexity && !keys.openai) || 
                    verificationStatus.anthropic === 'verifying' || 
                    verificationStatus.perplexity === 'verifying' || 
                    verificationStatus.openai === 'verifying'}
                  className="rounded-sm text-sm"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            )}
          </div>
        </div>
      </DialogContent>
      <PluginDocs
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />
    </Dialog>
  );
};
