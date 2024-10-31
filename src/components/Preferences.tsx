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
      {verificationStatus[type] === 'success' && (
        <p className="text-sm text-green-600 dark:text-green-400">
          API key verified successfully
        </p>
      )}
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
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'models', label: 'Models', icon: <Bot className="h-4 w-4" /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="h-4 w-4" /> },
    { id: 'plugins', label: 'Plugins', icon: <Code className="h-4 w-4" /> },
    { id: 'connections', label: 'Connections', icon: <Network className="h-4 w-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'api-keys':
        return (
          <div className="space-y-4">
            {renderApiKeyInput('anthropic', 'Anthropic API Key')}
            <div className="my-4" />
            {renderApiKeyInput('perplexity', 'Perplexity API Key')}
            <div className="my-4" />
            {renderApiKeyInput('openai', 'OpenAI API Key')}
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
                onClick={async () => {
                  const reset = await resetShortcuts();
                  setShortcuts(reset);
                }}
                className="text-xs"
              >
                Reset to defaults
              </Button>
            </div>
            {shortcuts
              .filter(shortcut => !shortcut.hidden)
              .map((shortcut) => (
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
      case 'plugins':
        return (
          <div className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  placeholder="Search community plugins..."
                  className="pl-8"
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowDocs(true)}
                className="whitespace-nowrap"
              >
                <FileText className="h-4 w-4 mr-2" />
                Docs
              </Button>
            </div>

            {/* Upload button */}
            <div className="flex justify-end">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        // Add file input click handler
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.js,.ts';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) {
                            // Handle plugin file upload
                            const reader = new FileReader();
                            reader.onload = async (e) => {
                              const content = e.target?.result as string;
                              // Create new plugin from file
                              const newPlugin: Plugin = {
                                id: nanoid(),
                                name: file.name.replace(/\.[^/.]+$/, ""),
                                description: "Imported plugin",
                                version: "1.0.0",
                                author: "Unknown",
                                enabled: false,
                                code: content,
                                hooks: {}
                              };
                              await savePlugin(newPlugin);
                              const newPlugins = await loadPlugins();
                              onPluginChange?.(newPlugins);
                            };
                            reader.readAsText(file);
                          }
                        };
                        input.click();
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Upload plugin file
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Installed plugins grid */}
            <div className="grid grid-cols-2 gap-4">
              {plugins.map((plugin) => (
                <Card
                  key={plugin.id}
                  className="p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-sm">{plugin.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {plugin.description}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        v{plugin.version} • by {plugin.author}
                      </div>
                    </div>
                    <Switch
                      checked={plugin.enabled}
                      onCheckedChange={(checked) => {
                        togglePlugin(plugin.id, checked);
                        const newPlugins = plugins.map(p =>
                          p.id === plugin.id ? { ...p, enabled: checked } : p
                        );
                        onPluginChange?.(newPlugins);
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={async () => {
                        await deletePlugin(plugin.id);
                        const newPlugins = plugins.filter(p => p.id !== plugin.id);
                        onPluginChange?.(newPlugins);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {plugins.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                No plugins installed
              </div>
            )}
          </div>
        );
      case 'connections':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Connected Services</h3>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Add Connection
              </Button>
            </div>

            {/* GitHub Connection */}
            <div className="flex items-center justify-between p-3 rounded-sm bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-sm">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium">GitHub</h4>
                  <p className="text-xs text-muted-foreground">Connect your GitHub account to access repositories</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Connect
              </Button>
            </div>

            {/* Slack Connection */}
            {/* <div className="flex items-center justify-between p-3 rounded-sm bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-sm">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Slack</h4>
                  <p className="text-xs text-muted-foreground">Connect to Slack to send and receive messages</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Connect
              </Button>
            </div> */}

            {/* Discord Connection */}
            <div className="flex items-center justify-between p-3 rounded-sm bg-muted">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-sm">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Discord</h4>
                  <p className="text-xs text-muted-foreground">Connect to Discord for community features</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Connect
              </Button>
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              <p>Connected services can be used by plugins to extend functionality.</p>
              <p>No data is shared without your explicit permission.</p>
            </div>
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
