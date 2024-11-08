import React from 'react';
import { Button } from "@/components/ui/button";
import { Trash2, RefreshCw, Database } from "lucide-react";
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
}

export const Storage: React.FC = () => {
  const [clearing, setClearing] = React.useState<string | null>(null);
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

  const sections: StorageSection[] = [
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
        window.location.reload();
      }
    }
  ];

  // Update cache sizes
  React.useEffect(() => {
    const updateSizes = async () => {
      const updatedSections = await Promise.all(
        sections.map(async (section) => ({
          ...section,
          size: await calculateCacheSize(section.id === 'all' ? '' : section.id)
        }))
      );
      setSections(updatedSections);
    };
    updateSizes();
  }, []);

  const [localSections, setSections] = React.useState(sections);

  const handleClear = async (section: StorageSection) => {
    setClearing(section.id);
    setError(null);
    try {
      await section.clearAction();
      // Update sizes after clearing
      const newSize = await calculateCacheSize(section.id === 'all' ? '' : section.id);
      setSections(prev => prev.map(s => 
        s.id === section.id ? { ...s, size: newSize } : s
      ));
    } catch (err) {
      setError(`Failed to clear ${section.title.toLowerCase()}`);
      console.error(err);
    } finally {
      setClearing(null);
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
                  disabled={clearing === section.id}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}; 