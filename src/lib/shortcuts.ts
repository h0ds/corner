import { KeyboardEvent } from 'react';

export interface KeyboardShortcut {
  id: string;
  description: string;
  defaultKey: string;
  currentKey: string;
  hidden?: boolean;
}

// Detect if we're on macOS
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'clear-history',
    description: 'Clear chat history',
    defaultKey: isMac ? '⌘ + K' : 'Ctrl + K',
    currentKey: isMac ? '⌘ + K' : 'Ctrl + K'
  },
  {
    id: 'toggle-sidebar',
    description: 'Toggle sidebar',
    defaultKey: isMac ? '⌘ + S' : 'Ctrl + S',
    currentKey: isMac ? '⌘ + S' : 'Ctrl + S'
  },
  {
    id: 'toggle-fullscreen',
    description: 'Toggle fullscreen',
    defaultKey: isMac ? '⌘ + F' : 'Ctrl + F',
    currentKey: isMac ? '⌘ + F' : 'Ctrl + F',
    hidden: true
  }
];

const SHORTCUTS_STORAGE_KEY = 'keyboard-shortcuts';

export async function loadShortcuts(): Promise<KeyboardShortcut[]> {
  try {
    const stored = localStorage.getItem(SHORTCUTS_STORAGE_KEY);
    if (!stored) return DEFAULT_SHORTCUTS;
    
    // When loading, ensure we're using the correct OS-specific keys
    const shortcuts = JSON.parse(stored);
    return shortcuts.map((shortcut: KeyboardShortcut) => {
      const defaultShortcut = DEFAULT_SHORTCUTS.find(s => s.id === shortcut.id);
      // If we're on macOS, ensure the shortcut uses ⌘ instead of Ctrl
      if (isMac && shortcut.currentKey.includes('Ctrl')) {
        return {
          ...shortcut,
          defaultKey: defaultShortcut?.defaultKey || shortcut.defaultKey,
          currentKey: shortcut.currentKey.replace('Ctrl', '⌘')
        };
      }
      // If we're not on macOS, ensure the shortcut uses Ctrl instead of ⌘
      if (!isMac && shortcut.currentKey.includes('⌘')) {
        return {
          ...shortcut,
          defaultKey: defaultShortcut?.defaultKey || shortcut.defaultKey,
          currentKey: shortcut.currentKey.replace('⌘', 'Ctrl')
        };
      }
      return {
        ...shortcut,
        defaultKey: defaultShortcut?.defaultKey || shortcut.defaultKey
      };
    });
  } catch (error) {
    console.error('Failed to load shortcuts:', error);
    return DEFAULT_SHORTCUTS;
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
    if (mod === '⌘') return e.metaKey;
    if (mod === 'Ctrl') return e.ctrlKey;
    if (mod === 'Alt') return e.altKey;
    if (mod === 'Shift') return e.shiftKey;
    return false;
  });

  const matchesKey = e.key.toUpperCase() === key.toUpperCase();
  return hasRequiredModifiers && matchesKey;
} 