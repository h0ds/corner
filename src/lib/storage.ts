import { Message, Thread } from '@/types';

const THREADS_KEY = 'lex-threads';
const ACTIVE_THREAD_KEY = 'lex-active-thread';

export function saveThread(thread: Thread): void {
  try {
    const threads = loadThreads();
    const index = threads.findIndex(t => t.id === thread.id);
    
    if (index >= 0) {
      threads[index] = thread;
    } else {
      threads.push(thread);
    }
    
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch (error) {
    console.error('Failed to save thread:', error);
  }
}

export function loadThreads(): Thread[] {
  try {
    const stored = localStorage.getItem(THREADS_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load threads:', error);
    return [];
  }
}

export function deleteThread(threadId: string): void {
  try {
    const threads = loadThreads().filter(t => t.id !== threadId);
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
  } catch (error) {
    console.error('Failed to delete thread:', error);
  }
}

export function saveActiveThreadId(threadId: string | null): void {
  try {
    if (threadId) {
      localStorage.setItem(ACTIVE_THREAD_KEY, threadId);
    } else {
      localStorage.removeItem(ACTIVE_THREAD_KEY);
    }
  } catch (error) {
    console.error('Failed to save active thread:', error);
  }
}

export function loadActiveThreadId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_THREAD_KEY);
  } catch (error) {
    console.error('Failed to load active thread:', error);
    return null;
  }
}

export function clearThreads(): void {
  try {
    localStorage.removeItem(THREADS_KEY);
    localStorage.removeItem(ACTIVE_THREAD_KEY);
  } catch (error) {
    console.error('Failed to clear threads:', error);
  }
} 