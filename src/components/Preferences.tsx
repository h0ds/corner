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
import { KeyRound, Palette, Bot, Keyboard, Network, Code, Zap, Volume2, Database, UserCircle } from "lucide-react";
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
import { VoiceSettings } from './preferences/VoiceSettings';
import { Profile } from './preferences/Profile';
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

type PreferenceTab = 'profile' | 'api-keys' | 'appearance' | 'models' | 'shortcuts' | 'plugins' | 'connections' | 'actions' | 'storage' | 'voice';

export const Preferences: React.FC<PreferencesProps> = ({ 
  isOpen, 
  onClose,
  selectedModel,
  onModelChange,
  initialTab = 'profile',
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
  const [activeTab, setActiveTab] = useState<PreferenceTab>(initialTab || 'profile');
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
    setActiveTab(initialTab || 'profile');
  }, [initialTab, isOpen]);

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
          setVerificationStatus(prev => ({
            ...prev,
            anthropic: storedKeys.anthropic ? 'success' : 'idle',
            perplexity: storedKeys.perplexity ? 'success' : 'idle',
            openai: storedKeys.openai ? 'success' : 'idle',
            xai: storedKeys.xai ? 'success' : 'idle',
            google: storedKeys.google ? 'success' : 'idle',
            elevenlabs: storedKeys.elevenlabs ? 'success' : 'idle'
          }));
        })
        .catch((error) => {
          console.error('Failed to load API keys:', error);
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
      setVerificationStatus(prev => ({
        ...prev,
        [type]: 'idle'
      }));
      return;
    }

    setVerificationStatus(prev => ({
      ...prev,
      [type]: 'verifying'
    }));

    try {
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
    if (!value.trim()) {
      setVerificationStatus(prev => ({ ...prev, [type]: 'idle' }));
    }
    setError(null);
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
    { id: 'profile', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> },
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
      case 'profile':
        return (
          <Profile />
        );
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
        <div className="flex h-[32rem]">
          <div className="w-48 border-r flex flex-col">
            <div className="flex-1 overflow-y-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2 text-sm font-medium",
                    "hover:bg-accent hover:text-accent-foreground",
                    activeTab === tab.id && "bg-accent"
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="shrink-0 p-4 border-t flex items-center justify-center gap-4">
              <a
                href="https://discord.gg/codeium"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 -28.5 256 256"
                  version="1.1"
                  xmlns="http://www.w3.org/2000/svg"
                  preserveAspectRatio="xMidYMid"
                >
                  <path
                    d="M216.856339,16.5966031 C200.285002,8.84328665 182.566144,3.2084988 164.041564,0 C161.766523,4.11318106 159.108624,9.64549908 157.276099,14.0464379 C137.583995,11.0849896 118.072967,11.0849896 98.7430163,14.0464379 C96.9108417,9.64549908 94.1925838,4.11318106 91.8971895,0 C73.3526068,3.2084988 55.6133949,8.86399117 39.0420583,16.6376612 C5.61752293,67.146514 -3.4433191,116.400813 1.08711069,164.955721 C23.2560196,181.510915 44.7403634,191.567697 65.8621325,198.148576 C71.0772151,190.971126 75.7283628,183.341335 79.7352139,175.300261 C72.104019,172.400575 64.7949724,168.822202 57.8887866,164.667963 C59.7209612,163.310589 61.5131304,161.891452 63.2445898,160.431257 C105.36741,180.133187 151.134928,180.133187 192.754523,160.431257 C194.506336,161.891452 196.298154,163.310589 198.110326,164.667963 C191.183787,168.842556 183.854737,172.420929 176.223542,175.320965 C180.230393,183.341335 184.861538,190.991831 190.096624,198.16893 C211.238746,191.588051 232.743023,181.531619 254.911949,164.955721 C260.227747,108.668201 245.831087,59.8662432 216.856339,16.5966031 Z M85.4738752,135.09489 C72.8290281,135.09489 62.4592217,123.290155 62.4592217,108.914901 C62.4592217,94.5396472 72.607595,82.7145587 85.4738752,82.7145587 C98.3405064,82.7145587 108.709962,94.5189427 108.488529,108.914901 C108.508531,123.290155 98.3405064,135.09489 85.4738752,135.09489 Z M170.525237,135.09489 C157.88039,135.09489 147.510584,123.290155 147.510584,108.914901 C147.510584,94.5396472 157.658606,82.7145587 170.525237,82.7145587 C183.391518,82.7145587 193.761324,94.5189427 193.539891,108.914901 C193.539891,123.290155 183.391518,135.09489 170.525237,135.09489 Z"
                    fill="currentColor"
                  >
                  </path>
                </svg>
              </a>
              <a
                href="https://twitter.com/codeiumdev"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 1200 1227"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M714.163 519.284L1160.89 0H1055.03L667.137 450.887L357.328 0H0L468.492 681.821L0 1226.37H105.866L515.491 750.218L842.672 1226.37H1200L714.137 519.284H714.163ZM569.165 687.828L521.697 619.934L144.011 87.6944H306.615L611.412 515.685L658.88 583.579L1055.08 1143.69H892.476L569.165 687.854V687.828Z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </div>
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
