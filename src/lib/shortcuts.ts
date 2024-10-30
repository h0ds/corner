import { KeyboardEvent } from 'react';

export interface KeyboardShortcut {
  id: string;
  description: string;
  defaultKey: string;
  currentKey: string;
}

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'clear-history',
    description: 'Clear chat history',
    defaultKey: '⌘/Ctrl + K',
    currentKey: '⌘/Ctrl + K'
  },
  {
    id: 'toggle-sidebar',
    description: 'Toggle sidebar',
    defaultKey: '⌘/Ctrl + S',
    currentKey: '⌘/Ctrl + S'
  }
];

const SHORTCUTS_STORAGE_KEY = 'keyboard-shortcuts';

export async function loadShortcuts(): Promise<KeyboardShortcut[]> {
  try {
    const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!stored) return Promise.resolve(DEFAULT_SHORTCUTS);
    return Promise.resolve(JSON.parse(stored));
  } catch (error) {
    console.error('Failed to load shortcuts:', error);
    return Promise.resolve(DEFAULT_SHORTCUTS);
  }
}

export async function saveShortcuts(shortcuts: KeyboardShortcut[]): Promise<void> {
  try {
    localStorage.setItem(SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
  } catch (error) {
    console.error('Failed to save shortcuts:', error);
  }
}

export async function resetShortcuts(): Promise<KeyboardShortcut[]> {
  const reset = DEFAULT_SHORTCUTS.map(shortcut => ({
    ...shortcut,
    currentKey: shortcut.defaultKey
  }));
  await saveShortcuts(reset);
  return reset;
}

export function matchesShortcut(e: KeyboardEvent<Element>, shortcut: KeyboardShortcut): boolean {
  const parts = shortcut.currentKey.split(' + ');
  const modifiers = parts.slice(0, -1);
  const key = parts[parts.length - 1];

  const hasRequiredModifiers = modifiers.every(mod => {
    if (mod === '⌘' || mod === 'Ctrl') return e.metaKey || e.ctrlKey;
    if (mod === 'Alt') return e.altKey;
    if (mod === 'Shift') return e.shiftKey;
    return false;
  });

  const matchesKey = e.key.toUpperCase() === key.toUpperCase();
  return hasRequiredModifiers && matchesKey;
} 