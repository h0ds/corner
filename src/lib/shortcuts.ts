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

export function matchesShortcut(e: KeyboardEvent, shortcut: KeyboardShortcut): boolean {
  const key = shortcut.currentKey.toLowerCase();
  const isCmd = key.includes('⌘') || key.includes('cmd') || key.includes('ctrl');
  const isAlt = key.includes('alt');
  const isShift = key.includes('shift');
  const mainKey = key.split(' + ').pop()?.toLowerCase() || '';

  return (
    ((e.metaKey || e.ctrlKey) === isCmd) &&
    (e.altKey === isAlt) &&
    (e.shiftKey === isShift) &&
    e.key.toLowerCase() === mainKey
  );
} 