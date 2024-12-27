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
import { KeyRound, Palette, Bot, Keyboard, Code, Zap, Volume2, Database, UserCircle } from "lucide-react";
import { cn } from '@/lib/utils';
import { KeyboardShortcut, saveShortcuts, resetShortcuts } from '@/lib/shortcuts';
import { Plugin } from '@/lib/plugins';
import { ApiKeys } from './preferences/ApiKeys';
import { Appearance } from './preferences/Appearance';
import { Models } from './preferences/Models';
import { Shortcuts } from './preferences/Shortcuts';
import { Plugins } from './preferences/Plugins';
import { Actions, Action } from './preferences/Actions';
import { Storage } from './preferences/Storage';
import { VoiceSettings } from './preferences/VoiceSettings';
import { showToast } from '@/lib/toast';
import { usePreferences } from '../hooks/usePreferences';
import { useDebounce } from '@/hooks/useDebounce';
import { Profile } from './preferences/Profile';
import { DiscordLogoIcon, TwitterLogoIcon } from '@radix-ui/react-icons';

interface PreferencesProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  defaultTab?: 'profile' | 'api-keys' | 'appearance' | 'models' | 'shortcuts' | 'plugins' | 'connections' | 'actions' | 'storage' | 'voice';
  plugins?: Plugin[];
  onPluginChange?: (plugins: Plugin[]) => void;
  actions?: Action[];
  onActionsChange?: (actions: Action[]) => void;
  apiKeys?: ApiKeys;
  onApiKeysChange?: (apiKeys: ApiKeys) => void;
  shortcuts?: KeyboardShortcut[];
  onShortcutsChange?: (shortcuts: KeyboardShortcut[]) => void;
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

type PreferenceTab = 'profile' | 'api-keys' | 'appearance' | 'models' | 'shortcuts' | 'plugins' | 'actions' | 'storage' | 'voice';

export const Preferences: React.FC<PreferencesProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onModelChange,
  defaultTab = 'profile',
  plugins = [],
  onPluginChange,
  actions = [],
  onActionsChange,
  apiKeys = {},
  onApiKeysChange,
  shortcuts = [],
  onShortcutsChange,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [nameInput, setNameInput] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { preferences, updatePreferences } = usePreferences();
  const debouncedName = useDebounce(nameInput, 500);
  const debouncedUsername = useDebounce(usernameInput, 500);

  useEffect(() => {
    if (isOpen) {
      setNameInput(preferences.name || '');
      setUsernameInput(preferences.username || '');
    }
  }, [isOpen, preferences.name, preferences.username]);

  const handleNameChange = async (value: string) => {
    setNameInput(value);
    setIsSaving(true);
    try {
      const success = await updatePreferences({ name: value });
      if (success) {
        showToast({
          title: "Success",
          description: "Name updated",
        });
      } else {
        showToast({
          title: "Error",
          description: "Failed to update name",
          variant: "destructive",
        });
        setNameInput(preferences.name || '');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleUsernameChange = async (value: string) => {
    setUsernameInput(value);
    setIsSaving(true);
    try {
      const success = await updatePreferences({ username: value });
      if (success) {
        showToast({
          title: "Success",
          description: "Username updated",
        });
      } else {
        showToast({
          title: "Error",
          description: "Failed to update username",
          variant: "destructive",
        });
        setUsernameInput(preferences.username || '');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64String = reader.result as string;
        const success = await updatePreferences({ profile_picture: base64String });
        if (success) {
          showToast({
            title: "Success",
            description: "Profile picture updated",
          });
        } else {
          showToast({
            title: "Error",
            description: "Failed to update profile picture",
            variant: "destructive",
          });
        }
      } finally {
        setIsSaving(false);
      }
    };
    reader.onerror = () => {
      showToast({
        title: "Error",
        description: "Failed to read image file",
        variant: "destructive",
      });
      setIsSaving(false);
    };
    reader.readAsDataURL(file);
  };

  const [verificationStatus, setVerificationStatus] = useState<Record<string, VerificationStatus>>({
    anthropic: 'idle',
    perplexity: 'idle',
    openai: 'idle',
    xai: 'idle',
    google: 'idle',
    elevenlabs: 'idle'
  });

  // Initialize verification status when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Set all statuses to idle initially
      const initialStatus = Object.entries(apiKeys).reduce((acc, [provider]) => {
        acc[provider] = 'idle';
        return acc;
      }, {} as Record<string, VerificationStatus>);
      
      setVerificationStatus(initialStatus);
      setError(null);

      // Verify all non-empty keys
      Object.entries(apiKeys).forEach(([provider, key]) => {
        if (key && key.trim().length > 0) {
          verifyKey(provider as keyof ApiKeys, key);
        }
      });
    }
  }, [isOpen]);

  // Update verification status when API keys change
  useEffect(() => {
    if (isOpen) {  // Only verify if dialog is open
      Object.entries(apiKeys).forEach(([provider, key]) => {
        if (key && key.trim().length > 0) {
          verifyKey(provider as keyof ApiKeys, key);
        } else {
          setVerificationStatus(prev => ({
            ...prev,
            [provider]: 'idle'
          }));
        }
      });
    }
  }, [apiKeys, isOpen]);

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
    if (onApiKeysChange) {
      const newKeys = { ...apiKeys };
      newKeys[type] = value;
      onApiKeysChange(newKeys);
    }
    if (!value) {
      setVerificationStatus(prev => ({ ...prev, [type]: 'idle' }));
    }
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    
    try {
      console.log('Saving API keys:', apiKeys);
      await invoke('set_api_keys', { 
        request: {
          anthropic: apiKeys.anthropic || "",
          perplexity: apiKeys.perplexity || "",
          openai: apiKeys.openai || "",
          xai: apiKeys.xai || "",
          google: apiKeys.google || "",
          elevenlabs: apiKeys.elevenlabs || "",
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
      setIsSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      console.log('Attempting to save profile preferences:', { name: nameInput, profilePicture: preferences.profile_picture });
      const success = await updatePreferences({
        name: nameInput,
        profile_picture: preferences.profile_picture,
      });
      if (success) {
        showToast({
          title: "Success",
          description: "Profile preferences saved successfully",
        });
      } else {
        showToast({
          title: "Error",
          description: "Failed to save profile preferences",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save preferences';
      setError(errorMessage);
      showToast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [shortcutsState, setShortcuts] = useState<KeyboardShortcut[]>(shortcuts);

  useEffect(() => {
    setShortcuts(shortcuts);
  }, [shortcuts]);

  const handleShortcutChange = async (shortcut: KeyboardShortcut) => {
    if (editingShortcutId === shortcut.id) {
      setEditingShortcutId(null);
    } else {
      setEditingShortcutId(shortcut.id);
    }
  };

  const handleShortcutSave = async (shortcuts: KeyboardShortcut[]) => {
    try {
      await saveShortcuts(shortcuts);
      setShortcuts(shortcuts);
      if (onShortcutsChange) {
        onShortcutsChange(shortcuts);
      }
      showToast({
        title: "Success",
        description: "Shortcuts saved",
      });
    } catch (error) {
      console.error('Failed to save shortcuts:', error);
      showToast({
        title: "Error",
        description: "Failed to save shortcuts",
        variant: "destructive"
      });
    }
  };

  const handleShortcutReset = async () => {
    try {
      const defaultShortcuts = await resetShortcuts();
      setShortcuts(defaultShortcuts);
      if (onShortcutsChange) {
        onShortcutsChange(defaultShortcuts);
      }
      showToast({
        title: "Success",
        description: "Shortcuts reset to default",
      });
    } catch (error) {
      console.error('Failed to reset shortcuts:', error);
      showToast({
        title: "Error",
        description: "Failed to reset shortcuts",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setError(null);
      setVerificationStatus({
        anthropic: 'idle',
        perplexity: 'idle',
        openai: 'idle',
        xai: 'idle',
        google: 'idle',
        elevenlabs: 'idle'
      });
      setEditingShortcutId(null);
    }
  }, [isOpen, defaultTab]);

  const tabs: { id: PreferenceTab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile', label: 'Profile', icon: <UserCircle className="h-4 w-4" /> },
    { id: 'api-keys', label: 'APIs', icon: <KeyRound className="h-4 w-4" /> },
    { id: 'appearance', label: 'Appearance', icon: <Palette className="h-4 w-4" /> },
    { id: 'models', label: 'Models', icon: <Bot className="h-4 w-4" /> },
    { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="h-4 w-4" /> },
    { id: 'plugins', label: 'Plugins', icon: <Code className="h-4 w-4" /> },
    // { id: 'connections', label: 'Connections', icon: <Network className="h-4 w-4" /> },
    { id: 'actions', label: 'Actions', icon: <Zap className="h-4 w-4" /> },
    { id: 'storage', label: 'Storage', icon: <Database className="h-4 w-4" /> },
    { id: 'voice', label: 'Voice', icon: <Volume2 className="h-4 w-4" /> },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <Profile
            name={nameInput}
            username={usernameInput}
            profilePicture={preferences.profile_picture}
            onNameChange={handleNameChange}
            onUsernameChange={handleUsernameChange}
            onImageUpload={handleImageUpload}
            isSaving={isSaving}
            error={error}
          />
        );
      case 'api-keys':
        return (
          <ApiKeys
            keys={apiKeys}
            verificationStatus={verificationStatus}
            error={error}
            onKeyChange={handleKeyChange}
            onRetryVerification={async (type) => {
              if (apiKeys[type]) {
                const error = await verifyKey(type, apiKeys[type]);
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
            apiKeys={apiKeys}
          />
        );
      case 'shortcuts':
        return (
          <Shortcuts
            shortcuts={shortcutsState}
            editingShortcutId={editingShortcutId}
            onShortcutChange={handleShortcutChange}
            onSave={handleShortcutSave}
            onReset={handleShortcutReset}
          />
        );
      case 'plugins':
        return (
          <Plugins
            plugins={plugins}
            onPluginChange={onPluginChange}
          />
        );
      // case 'connections':
      //   return <Connections />;
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
            apiKey={apiKeys.elevenlabs}
          />
        );
      default:
        console.warn('Unknown tab:', activeTab);
        return <Profile
          name={nameInput}
          username={usernameInput}
          profilePicture={preferences.profile_picture}
          onNameChange={handleNameChange}
          onUsernameChange={handleUsernameChange}
          onImageUpload={handleImageUpload}
          isSaving={isSaving}
          error={error}
        />;
    }
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
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  className={cn(
                    "flex items-center gap-3 w-full px-4 py-2 text-sm font-medium",
                    "hover:bg-accent hover:text-accent-foreground transition-colors",
                    activeTab === tab.id && "bg-accent text-accent-foreground",
                    index === 0 && "rounded-tl-xl"
                  )}
                  onClick={() => {
                    console.log('Switching to tab:', tab.id);
                    setActiveTab(tab.id);
                    setError(null);
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="shrink-0 p-4 border-t flex items-center justify-center gap-4">
              <a
                href="https://discord.gg/tK3JUb4XRG"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <DiscordLogoIcon className="h-4 w-4" />
              </a>
              <a
                href="https://x.com/cornerdotac"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
              >
                <TwitterLogoIcon className="h-4 w-4" />
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
              <div key={activeTab}>
                {renderContent()}
              </div>

              {error && (
                <Alert variant="destructive" className="rounded-xl mt-4">
                  <AlertDescription className="text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {activeTab === 'api-keys' && (
                <DialogFooter className="gap-2 mt-6">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save API Keys"}
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
