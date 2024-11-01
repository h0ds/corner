import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Search, FileText, Plus, Trash2 } from 'lucide-react';
import { Plugin, savePlugin, deletePlugin, togglePlugin, loadPlugins } from '@/lib/plugins';
import { nanoid } from 'nanoid';
import { PluginDocs } from '../PluginDocs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PluginsProps {
  plugins: Plugin[];
  onPluginChange?: (plugins: Plugin[]) => void;
}

export const Plugins: React.FC<PluginsProps> = ({
  plugins,
  onPluginChange,
}) => {
  const [showDocs, setShowDocs] = useState(false);

  return (
    <div className="space-y-4">
      {/* Search bar and docs button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Search for Lex plugins"
            className="pl-10 -mb-0.5"
          />
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ml-1" />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowDocs(true)}
          className="whitespace-nowrap"
        >
          <FileText className="h-4 w-4" />
          <span className="mt-1">Docs</span>
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
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.js,.ts';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = async (e) => {
                        const content = e.target?.result as string;
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

      <PluginDocs
        isOpen={showDocs}
        onClose={() => setShowDocs(false)}
      />
    </div>
  );
}; 