import React from 'react';
import { KeyboardShortcut } from '@/lib/shortcuts';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';

interface ShortcutsProps {
  shortcuts: KeyboardShortcut[];
  editingShortcutId: string | null;
  onShortcutChange: (shortcut: KeyboardShortcut) => void;
  onReset: () => Promise<void>;
  onSave: (shortcuts: KeyboardShortcut[]) => Promise<void>;
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
      <div className="space-y-2">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className="flex items-center justify-between p-3 rounded-xl bg-muted"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium">{shortcut.name}</div>
              <div className="text-xs text-muted-foreground">
                {shortcut.description}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 text-xs bg-background rounded-xl border">
                {editingShortcutId === shortcut.id ? 'Press keys...' : shortcut.currentKey}
              </kbd>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onShortcutChange(shortcut)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="text-xs"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}; 