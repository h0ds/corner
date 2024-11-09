import { Thread, NoteThread } from '@/types';
const THREADS_KEY = 'lex-threads';
const ACTIVE_THREAD_KEY = 'lex-active-thread';
const SELECTED_MODEL_KEY = 'lex-selected-model';
const THREAD_ORDER_KEY = 'thread-order';

export function saveThread(thread: Thread): void {
  try {
    // Load existing threads
    const threadsJson = localStorage.getItem(THREADS_KEY);
    const threads: Thread[] = threadsJson ? JSON.parse(threadsJson) : [];
    
    // Find and update or add the thread
    const index = threads.findIndex(t => t.id === thread.id);
    if (index >= 0) {
      // Update existing thread, preserving linkedNotes
      threads[index] = {
        ...threads[index],
        ...thread,
        linkedNotes: thread.linkedNotes || threads[index].linkedNotes || [],
        updatedAt: Date.now()
      };

      // If it's a note, ensure content is preserved
      if (thread.isNote && 'content' in thread) {
        (threads[index] as NoteThread).content = thread.content;
      }
    } else {
      // Add new thread
      threads.push({
        ...thread,
        linkedNotes: thread.linkedNotes || [],
        updatedAt: Date.now()
      });
    }
    
    // Save back to localStorage
    localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
    
    // Update thread order if needed
    const orderJson = localStorage.getItem(THREAD_ORDER_KEY);
    if (orderJson) {
      const order: string[] = JSON.parse(orderJson);
      if (!order.includes(thread.id)) {
        order.push(thread.id);
        localStorage.setItem(THREAD_ORDER_KEY, JSON.stringify(order));
      }
    }

    console.log('Saved thread:', {
      id: thread.id,
      isNote: thread.isNote,
      content: thread.isNote ? thread.content.slice(0, 50) + '...' : undefined,
      linkedNotes: thread.linkedNotes,
      totalThreads: threads.length
    });
  } catch (error) {
    console.error('Failed to save thread:', error);
  }
}

export function loadThreads(): Thread[] {
  try {
    // Load all threads
    const threadsJson = localStorage.getItem(THREADS_KEY);
    const threads: Thread[] = threadsJson ? JSON.parse(threadsJson) : [];
    
    // Ensure all threads have linkedNotes array
    const processedThreads = threads.map(thread => ({
      ...thread,
      linkedNotes: thread.linkedNotes || []
    }));
    
    // Load thread order
    const orderJson = localStorage.getItem(THREAD_ORDER_KEY);
    const order: string[] = orderJson ? JSON.parse(orderJson) : [];
    
    if (order.length > 0) {
      // Create a map for quick thread lookup
      const threadMap = new Map(processedThreads.map(t => [t.id, t]));
      
      // First, add threads in the saved order
      const orderedThreads = order
        .map(id => threadMap.get(id))
        .filter((t): t is Thread => t !== undefined);
      
      // Then add any new threads that aren't in the order
      const remainingThreads = processedThreads.filter(t => !order.includes(t.id));
      
      return [...orderedThreads, ...remainingThreads];
    }
    
    return processedThreads.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to load threads:', error);
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

export function deleteThread(threadId: string): void {
  try {
    const threads = loadThreads();
    
    // Remove links to this thread from other threads
    const updatedThreads = threads.map(thread => {
      if (thread.linkedNotes?.includes(threadId)) {
        return {
          ...thread,
          linkedNotes: thread.linkedNotes.filter(id => id !== threadId)
        };
      }
      return thread;
    });
    
    // Filter out the deleted thread
    const filteredThreads = updatedThreads.filter(t => t.id !== threadId);
    
    // Save the updated threads
    localStorage.setItem(THREADS_KEY, JSON.stringify(filteredThreads));
    
    // Update the order
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
  