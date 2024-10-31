import React from 'react';
import { Button } from "@/components/ui/button";
import { KeyboardShortcut } from '@/lib/shortcuts';
import { RotateCcw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ShortcutsProps {
  shortcuts: KeyboardShortcut[];
  editingShortcutId: string | null;
  onShortcutChange: (shortcut: KeyboardShortcut) => void;
  onReset: () => void;
  onSave: (shortcuts: KeyboardShortcut[]) => void;
}

export const Shortcuts: React.FC<ShortcutsProps> = ({
  shortcuts,
  editingShortcutId,
  onShortcutChange,
  onReset,
  onSave,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
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
                  {shortcut.currentKey}
                  <span className="ml-2 text-muted-foreground">(Enter to save, Esc to cancel)</span>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onShortcutChange(shortcut)}
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
                          onSave(updated);
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
}; 