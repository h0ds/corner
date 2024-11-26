import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, Database, Download } from "lucide-react";
import { invoke } from '@tauri-apps/api/core';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface StorageSection {
  id: string;
  title: string;
  description: string;
  clearAction: () => Promise<void>;
  size?: string;
  getSize?: () => Promise<string>;
  hasDownloadAction?: boolean;
  isDownloading?: boolean;
}

export const Storage: React.FC = () => {
  const [clearing, setClearing] = React.useState<string | null>(null);
  const [downloading, setDownloading] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const calculateCacheSize = async (prefix: string): Promise<string> => {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        totalSize += localStorage.getItem(key)?.length || 0;
      }
    }
    return (totalSize / 1024).toFixed(2) + ' KB';
  };

  const getWhisperModelSize = async (): Promise<string> => {
    try {
      const sizeInBytes = await invoke<number>('get_whisper_model_size');
      console.log('Received model size from backend:', sizeInBytes, 'bytes');
      // Format size to match the actual model size (140.54 MB)
      const sizeInMB = sizeInBytes / (1024 * 1024);
      console.log('Calculated size in MB:', sizeInMB.toFixed(2), 'MB');
      return sizeInMB.toFixed(2) + ' MB';
    } catch (error) {
      console.error('Failed to get Whisper model size:', error);
      return '0 MB';
    }
  };

  const checkWhisperModel = async (): Promise<boolean> => {
    try {
      return await invoke<boolean>('check_whisper_model');
    } catch (error) {
      console.error('Failed to check Whisper model:', error);
      return false;
    }
  };

  const sections: StorageSection[] = [
    {
      id: 'whisper_model',
      title: 'Whisper Model',
      description: 'Voice transcription model cache',
      clearAction: async () => {
        await invoke('delete_whisper_model');
      },
      getSize: getWhisperModelSize,
      hasDownloadAction: true
    },
    {
      id: 'note_cache',
      title: 'Note Cache',
      description: 'Temporary storage for unsaved note changes',
      clearAction: async () => {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('note_cache_')) {
            localStorage.removeItem(key);
          }
        });
      }
    },
    {
      id: 'preferences',
      title: 'Preferences',
      description: 'Application settings and preferences',
      clearAction: async () => {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith('preference_')) {
            localStorage.removeItem(key);
          }
        });
        window.location.reload();
      }
    },
    {
      id: 'shortcuts',
      title: 'Keyboard Shortcuts',
      description: 'Custom keyboard shortcut configurations',
      clearAction: async () => {
        localStorage.removeItem('keyboard_shortcuts');
        window.location.reload();
      }
    },
    {
      id: 'all',
      title: 'All Storage',
      description: 'Clear all application data and reset to defaults',
      clearAction: async () => {
        localStorage.clear();
        await invoke('delete_whisper_model');
        window.location.reload();
      }
    }
  ];

  // Update cache sizes and model status
  React.useEffect(() => {
    const updateSizes = async () => {
      console.log('Updating storage sizes...');
      const hasModel = await checkWhisperModel();
      console.log('Has Whisper model:', hasModel);
      const updatedSections = await Promise.all(
        sections.map(async (section) => {
          const size = section.getSize 
            ? await section.getSize()
            : await calculateCacheSize(section.id === 'all' ? '' : section.id);
          console.log(`Size for ${section.id}:`, size);
          return {
            ...section,
            size,
            isDownloading: section.id === 'whisper_model' && downloading === section.id,
            hasDownloadAction: section.id === 'whisper_model' && !hasModel
          };
        })
      );
      setSections(updatedSections);
    };
    updateSizes();
  }, [downloading]);

  const [localSections, setSections] = React.useState(sections);

  const handleClear = async (section: StorageSection) => {
    setClearing(section.id);
    setError(null);
    try {
      await section.clearAction();
      // Update sizes after clearing
      const newSize = section.getSize 
        ? await section.getSize()
        : await calculateCacheSize(section.id === 'all' ? '' : section.id);
      setSections(prev => prev.map(s => 
        s.id === section.id 
          ? { ...s, size: newSize, hasDownloadAction: section.id === 'whisper_model' } 
          : s
      ));
    } catch (err) {
      setError(`Failed to clear ${section.title.toLowerCase()}`);
      console.error(err);
    } finally {
      setClearing(null);
    }
  };

  const handleDownload = async (section: StorageSection) => {
    if (section.id !== 'whisper_model') return;
    
    setDownloading(section.id);
    setError(null);
    try {
      await invoke('download_whisper_model');
      const newSize = await getWhisperModelSize();
      setSections(prev => prev.map(s => 
        s.id === section.id 
          ? { ...s, size: newSize, hasDownloadAction: false } 
          : s
      ));
    } catch (err) {
      setError(`Failed to download ${section.title.toLowerCase()}`);
      console.error(err);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Manage application storage and cached data
        </p>
      </div>

      <div className="grid gap-4">
        {localSections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {section.title}
                </CardTitle>
                {section.size && (
                  <span className="text-xs text-muted-foreground">
                    {section.size}
                  </span>
                )}
              </div>
              <CardDescription className="text-xs">
                {section.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleClear(section)}
                  disabled={clearing === section.id || downloading === section.id}
                  className="w-full"
                >
                  {clearing === section.id ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Clearing...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear {section.title}
                    </>
                  )}
                </Button>
                {section.hasDownloadAction && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(section)}
                    disabled={clearing === section.id || downloading === section.id}
                    className="w-full"
                  >
                    {downloading === section.id ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Model
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-2">{error}</p>
      )}
    </div>
  );
};