import { Thread, NoteThread } from '@/types';
import { nanoid } from 'nanoid';

const THREADS_KEY = 'lex-threads';
const ACTIVE_THREAD_KEY = 'lex-active-thread';
const SELECTED_MODEL_KEY = 'lex-selected-model';
const THREAD_ORDER_KEY = 'thread-order';

export function saveThread(thread: Thread): void {
  try {
    const threadsJson = localStorage.getItem(THREADS_KEY);
    const threads: Thread[] = threadsJson ? JSON.parse(threadsJson) : [];
    
    // Ensure thread has all required properties
    const validatedThread = {
      ...thread,
      id: thread.id || nanoid(),
      name: thread.name || 'Untitled',
      files: Array.isArray(thread.files) ? thread.files : [],
      createdAt: thread.createdAt || Date.now(),
      updatedAt: thread.updatedAt || Date.now(),
      cachedFiles: Array.isArray(thread.cachedFiles) ? thread.cachedFiles : [],
      linkedNotes: Array.isArray(thread.linkedNotes) ? thread.linkedNotes : [],
      isNote: typeof thread.isNote === 'boolean' ? thread.isNote : false,
    };
    
    if (!validatedThread.isNote) {
      (validatedThread as any).messages = Array.isArray((thread as any).messages) 
        ? (thread as any).messages.map((msg: any) => ({
            ...msg,
            timestamp: msg.timestamp || Date.now()
          }))
        : [];
    }
    
    const index = threads.findIndex(t => t.id === thread.id);
    if (index >= 0) {
      threads[index] = validatedThread;
    } else {
      threads.push(validatedThread);
    }
    
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    console.log('Saved thread:', {
      id: thread.id,
      isNote: thread.isNote,
      contentLength: thread.isNote ? (thread as any).content?.length : undefined,
      linkedNotes: thread.linkedNotes?.length || 0,
      fileCount: thread.files?.length || 0,
      filesInfo: thread.files?.map(f => ({ name: f.name, type: f.type })) || []
    });
  } catch (error) {
    console.error('Failed to save thread:', error);
  }
}

export function loadThreads(): Thread[] {
  try {
    const threadsJson = localStorage.getItem(THREADS_KEY);
    if (!threadsJson) {
      console.log('No threads found in storage, initializing empty array');
      return [];
    }

    const threads: Thread[] = JSON.parse(threadsJson);
    
    // Validate and repair thread data
    const validatedThreads = threads.map(thread => ({
      ...thread,
      id: thread.id || nanoid(),
      name: thread.name || 'Untitled',
      files: Array.isArray(thread.files) ? thread.files : [],
      createdAt: thread.createdAt || Date.now(),
      updatedAt: thread.updatedAt || Date.now(),
      cachedFiles: Array.isArray(thread.cachedFiles) ? thread.cachedFiles : [],
      linkedNotes: Array.isArray(thread.linkedNotes) ? thread.linkedNotes : [],
      isNote: typeof thread.isNote === 'boolean' ? thread.isNote : false,
    }));

    console.log('Loaded threads:', {
      total: validatedThreads.length,
      notes: validatedThreads.filter(t => t.isNote).length,
      chats: validatedThreads.filter(t => !t.isNote).length,
      totalFiles: validatedThreads.reduce((sum, t) => sum + (t.files?.length || 0), 0),
      filesPerThread: validatedThreads.map(t => ({
        threadId: t.id,
        fileCount: t.files?.length || 0,
        files: t.files?.map(f => ({ name: f.name, type: f.type })) || []
      }))
    });

    return validatedThreads;
  } catch (error) {
    console.error('Failed to load threads:', error);
    // Return empty array instead of throwing to prevent app from breaking
    return [];
  }
}

export function saveThreadOrder(threadIds: string[]): void {
  try {
    localStorage.setItem(THREAD_ORDER_KEY, JSON.stringify(threadIds));
    console.log('Saved thread order:', threadIds);
  } catch (error) {
    console.error('Failed to save thread order:', error);
  }
}

export function loadThreadOrder(): string[] | null {
  try {
    const orderJson = localStorage.getItem(THREAD_ORDER_KEY);
    if (!orderJson) {
      return null;
    }
    return JSON.parse(orderJson);
  } catch (error) {
    console.error('Failed to load thread order:', error);
    return null;
  }
}

export function deleteThread(threadId: string): void {
  try {
    const threadsJson = localStorage.getItem(THREADS_KEY);
    if (!threadsJson) return;

    const threads: Thread[] = JSON.parse(threadsJson);
    const updatedThreads = threads.filter(t => t.id !== threadId);
    
    localStorage.setItem(THREADS_KEY, JSON.stringify(updatedThreads));
    console.log('Deleted thread:', threadId);
    
    // Also update thread order
    const orderJson = localStorage.getItem(THREAD_ORDER_KEY);
    if (orderJson) {
      const order: string[] = JSON.parse(orderJson);
      const updatedOrder = order.filter(id => id !== threadId);
      localStorage.setItem(THREAD_ORDER_KEY, JSON.stringify(updatedOrder));
    }
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
    console.error('Failed to save active thread ID:', error);
  }
}

export function loadActiveThreadId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_THREAD_KEY);
  } catch (error) {
    console.error('Failed to load active thread ID:', error);
    return null;
  }
}

export function clearThreads(): void {
  try {
    localStorage.removeItem(THREADS_KEY);
    localStorage.removeItem(ACTIVE_THREAD_KEY);
    localStorage.removeItem(THREAD_ORDER_KEY);
    console.log('Cleared all threads');
  } catch (error) {
    console.error('Failed to clear threads:', error);
  }
}

export function saveSelectedModel(modelId: string): void {
  try {
    localStorage.setItem(SELECTED_MODEL_KEY, modelId);
  } catch (error) {
    console.error('Failed to save selected model:', error);
  }
}

export function loadSelectedModel(): string | null {
  try {
    return localStorage.getItem(SELECTED_MODEL_KEY);
  } catch (error) {
    console.error('Failed to load selected model:', error);
    return null;
  }
}