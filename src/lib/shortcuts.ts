import { KeyboardEvent } from 'react';

export interface KeyboardShortcut {
  id: string;
  name: string;
  description: string;
  defaultKey: string;
  currentKey: string;
}

// Detect if we're on macOS
const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

export const DEFAULT_SHORTCUTS: KeyboardShortcut[] = [
  {
    id: 'clear-history',
    name: 'Clear History',
    description: 'Clear the current thread history',
    defaultKey: '⌘/Ctrl + K',
    currentKey: '⌘/Ctrl + K'
  },
  {
    id: 'toggle-sidebar',
    name: 'Toggle Sidebar',
    description: 'Show or hide the sidebar',
    defaultKey: '⌘/Ctrl + S',
    currentKey: '⌘/Ctrl + S'
  },
  {
    id: 'search',
    name: 'Search',
    description: 'Open search dialog',
    defaultKey: '⌘/Ctrl + F',
    currentKey: '⌘/Ctrl + F'
  },
  {
    id: 'new-note',
    name: 'New Note',
    description: 'Create a new note',
    defaultKey: '⌘/Ctrl + N',
    currentKey: '⌘/Ctrl + N'
  },
  {
    id: 'new-thread',
    name: 'New Thread',
    description: 'Create a new chat thread',
    defaultKey: '⌘/Ctrl + T',
    currentKey: '⌘/Ctrl + T'
  },
  {
    id: 'delete-thread',
    name: 'Delete Thread/Note',
    description: 'Delete the current thread or note',
    defaultKey: 'Backspace',
    currentKey: 'Backspace'
  }
];

const SHORTCUTS_STORAGE_KEY = 'keyboard-shortcuts';

export async function loadShortcuts(): Promise<KeyboardShortcut[]> {
  const stored = localStorage.getItem('shortcuts');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('Failed to parse stored shortcuts:', error);
    }
  }
  return DEFAULT_SHORTCUTS;
}

export async function saveShortcuts(shortcuts: KeyboardShortcut[]): Promise<void> {
  localStorage.setItem('shortcuts', JSON.stringify(shortcuts));
  window.dispatchEvent(new Event('shortcutsChange'));
}

export async function resetShortcuts(): Promise<KeyboardShortcut[]> {
  await saveShortcuts(DEFAULT_SHORTCUTS);
  return DEFAULT_SHORTCUTS;
}

export function matchesShortcut(e: KeyboardEvent<Element>, shortcut: KeyboardShortcut): boolean {
  // Special case for delete thread
  if (shortcut.id === 'delete-thread') {
    return (e.key === 'Backspace' && (e.metaKey || e.ctrlKey));
  }

  // Parse the current key combination
  const currentKeyParts = shortcut.currentKey.toLowerCase().split(' + ');
  
  // Build the pressed key combination
  const pressedKeys: string[] = [];
  if (e.metaKey) pressedKeys.push('⌘');
  if (e.ctrlKey && !e.metaKey) pressedKeys.push('ctrl');
  if (e.altKey) pressedKeys.push('alt');
  if (e.shiftKey) pressedKeys.push('shift');
  
  // Add the main key
  if (e.key !== 'Meta' && e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift') {
    pressedKeys.push(e.key.toLowerCase());
  }

  // Convert pressed keys to a string for comparison
  const pressedKeyString = pressedKeys.join(' + ');

  // Check if the combinations match
  return currentKeyParts.length === pressedKeys.length &&
    currentKeyParts.every(key => {
      // Handle command key variations
      if (key === '⌘' || key === 'cmd' || key === 'ctrl') {
        return pressedKeys.some(pressed => pressed === '⌘' || pressed === 'ctrl');
      }
      return pressedKeys.includes(key);
    });
}