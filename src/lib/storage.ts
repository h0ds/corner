import { Message } from '@/types';

const STORAGE_KEY = 'lex-chat-history';

export function saveMessages(messages: Message[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
}

export function loadMessages(): Message[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const messages = JSON.parse(stored) as Message[];
    return messages;
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
    return [];
  }
}

export function clearMessages(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear messages from localStorage:', error);
  }
} 