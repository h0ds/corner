import React from 'react';
import { FileUp, Command, Keyboard } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from './ui/button';

interface ShortcutItem {
  key: string;
  description: string;
  icon?: React.ReactNode;
}

const shortcuts: ShortcutItem[] = [
  { key: '⌘/Ctrl + K', description: 'Clear chat history', icon: <Command className="h-4 w-4" /> },
  { key: '⌘/Ctrl + S', description: 'Toggle sidebar', icon: <Keyboard className="h-4 w-4" /> },
];

export function Shortcuts() {
  return (
    <div className="flex items-center gap-2">
      <Dialog>
        <DialogTrigger asChild>
          <Button 
            variant="outline" 
            size="icon"
            className="rounded-md"
          >
            <FileUp className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-muted"
              >
                <div className="flex items-center gap-2">
                  {shortcut.icon}
                  <span className="text-sm">{shortcut.description}</span>
                </div>
                <kbd className="px-2 py-1 text-xs bg-background rounded-md border">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 