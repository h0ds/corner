import { Thread, NoteThread } from '@/types';
const THREADS_KEY = 'lex-threads';
const ACTIVE_THREAD_KEY = 'lex-active-thread';
const SELECTED_MODEL_KEY = 'lex-selected-model';
const THREAD_ORDER_KEY = 'thread-order';

export function saveThread(thread: Thread): void {
  try {
    const threadsJson = localStorage.getItem(THREADS_KEY);
    const threads: Thread[] = threadsJson ? JSON.parse(threadsJson) : [];
    
    if (!thread.isNote) {
      thread.messages = thread.messages.map(msg => ({
        ...msg,
        timestamp: msg.timestamp || Date.now()
      }));
    }
    
    const index = threads.findIndex(t => t.id === thread.id);
    if (index >= 0) {
      threads[index] = {
        ...threads[index],
        ...thread,
        linkedNotes: thread.linkedNotes || [],
        content: thread.isNote ? thread.content : undefined,
        updatedAt: Date.now()
      };
    } else {
      threads.push({
        ...thread,
        linkedNotes: thread.linkedNotes || [],
        content: thread.isNote ? thread.content : undefined,
        updatedAt: Date.now()
      });
    }
    
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    console.log('Saved thread:', {
      id: thread.id,
      isNote: thread.isNote,
      contentLength: thread.isNote ? thread.content.length : undefined,
      linkedNotes: thread.linkedNotes || []
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
      linkedNotes: Array.isArray(thread.linkedNotes) ? thread.linkedNotes : [],
      isNote: typeof thread.isNote === 'boolean' ? thread.isNote : false,
      content: thread.isNote ? (thread.content || '') : undefined,
      updatedAt: thread.updatedAt || Date.now()
    }));

    console.log('Loaded threads:', {
      total: validatedThreads.length,
      notes: validatedThreads.filter(t => t.isNote).length,
      chats: validatedThreads.filter(t => !t.isNote).length
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
    const threads = loadThreads();
    
    const updatedThreads = threads.map(thread => {
      if (thread.linkedNotes?.includes(threadId)) {
        return {
          ...thread,
          linkedNotes: thread.linkedNotes.filter(id => id !== threadId)
        };
      }
      return thread;
    });
    
    const filteredThreads = updatedThreads.filter(t => t.id !== threadId);
    
    localStorage.setItem(THREADS_KEY, JSON.stringify(filteredThreads));
    
    const orderJson = localStorage.getItem(THREAD_ORDER_KEY);
    if (orderJson) {
      const order: string[] = JSON.parse(orderJson);
      const newOrder = order.filter(id => id !== threadId);
      localStorage.setItem(THREAD_ORDER_KEY, JSON.stringify(newOrder));
    }
    
    console.log('Deleted thread:', {
      threadId,
      remainingThreads: filteredThreads.length
    });
  } catch (error) {
    console.error('Failed to delete thread:', error);
  }
}

export function saveActiveThreadId(threadId: string | null): void {
  try {
    if (threadId) {
      localStorage.setItem(ACTIVE_THREAD_KEY, threadId);
      console.log('Saved active thread:', threadId);
    } else {
      localStorage.removeItem(ACTIVE_THREAD_KEY);
      console.log('Cleared active thread');
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
    console.log('Cleared all threads and active thread');
  } catch (error) {
    console.error('Failed to clear threads:', error);
  }
}

export function saveSelectedModel(modelId: string): void {
  try {
    localStorage.setItem(SELECTED_MODEL_KEY, modelId);
    console.log('Saved selected model:', modelId);
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