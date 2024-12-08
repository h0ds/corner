import React, { useEffect, useCallback, useState } from 'react';
import { KeyboardShortcut } from '@/lib/shortcuts';
import { Button } from '@/components/ui/button';
import { Keyboard } from 'lucide-react';
import { Alert } from '@/components/ui/alert';

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
  const [pendingShortcut, setPendingShortcut] = useState<string>('');
  const [currentKeys, setCurrentKeys] = useState<string[]>([]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!editingShortcutId) return;

    e.preventDefault();
    
    // If Enter is pressed, confirm the shortcut
    if (e.key === 'Enter' && currentKeys.length > 0) {
      const shortcut = shortcuts.find(s => s.id === editingShortcutId);
      if (!shortcut) return;

      const newShortcut = {
        ...shortcut,
        currentKey: pendingShortcut
      };
      onShortcutChange(newShortcut);
      onSave(shortcuts.map(s => s.id === editingShortcutId ? newShortcut : s));
      setPendingShortcut('');
      setCurrentKeys([]);
      return;
    }

    // If Escape is pressed, cancel the edit
    if (e.key === 'Escape') {
      onShortcutChange(shortcuts.find(s => s.id === editingShortcutId)!);
      setPendingShortcut('');
      setCurrentKeys([]);
      return;
    }

    // Otherwise, update the pending shortcut
    const keys: string[] = [];
    if (e.metaKey) keys.push('⌘');
    if (e.ctrlKey && !e.metaKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Enter') {
      keys.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
    }

    if (keys.length > 0) {
      setCurrentKeys(keys);
      setPendingShortcut(keys.join(' + '));
    }
  }, [editingShortcutId, shortcuts, onShortcutChange, onSave, pendingShortcut, currentKeys]);

  useEffect(() => {
    if (editingShortcutId) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [editingShortcutId, handleKeyDown]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          <h2 className="text-lg font-medium">Keyboard Shortcuts</h2>
        </div>
        <Button variant="outline" onClick={onReset}>
          Reset to Default
        </Button>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4">
        Configure keyboard shortcuts for common actions. Click a shortcut to edit it, then press your desired keys and press Enter to confirm.
      </div>

      <div className="grid gap-4">
        {shortcuts.map((shortcut) => (
          <div
            key={shortcut.id}
            className={`
              p-3 rounded-lg border transition-colors cursor-pointer
              ${editingShortcutId === shortcut.id 
                ? 'bg-accent border-accent' 
                : 'hover:bg-accent/50 border-transparent'
              }
            `}
            onClick={() => onShortcutChange(shortcut)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium mb-1">{shortcut.name}</div>
                <div className="text-sm text-muted-foreground">
                  {shortcut.description}
                </div>
              </div>
              <kbd className="px-2 py-1 text-xs font-mono bg-background rounded border shadow-sm">
                {editingShortcutId === shortcut.id 
                  ? pendingShortcut || 'Press keys...'
                  : shortcut.currentKey}
              </kbd>
            </div>
          </div>
        ))}
      </div>

      {editingShortcutId && (
        <Alert className="mt-4">
          Press your desired key combination, then press Enter to confirm or Escape to cancel.
        </Alert>
      )}
    </div>
  );
};