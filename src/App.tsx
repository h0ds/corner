import React, { useState, useRef, useEffect, useMemo, useCallback, KeyboardEvent as ReactKeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Preferences } from "./components/Preferences";
import { AVAILABLE_MODELS } from "./components/ModelSelector";
import { FilePreview } from "./components/FilePreview";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getFileHandler } from '@/lib/fileHandlers';
import {
  saveThread,
  loadThreads,
  deleteThread,
  saveActiveThreadId,
  loadActiveThreadId, saveSelectedModel,
  loadSelectedModel,
  saveThreadOrder
} from '@/lib/storage';
import { ModelIcon } from './components/ModelIcon';
import { nanoid } from 'nanoid';
import { Message, Thread, NoteThread, ChatThread, FileAttachment } from '@/types';
import { initializeCache } from '@/lib/fileCache';
import { KeyboardShortcut, loadShortcuts, matchesShortcut, saveShortcuts } from '@/lib/shortcuts';
import { Footer } from './components/Footer';
import { ResizeObserver } from './components/ResizeObserver';
import { Plugin, loadPlugins } from '@/lib/plugins';
import { ThreadHeader } from './components/ThreadHeader';
import { cn } from '@/lib/utils';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileLinkMenu } from './components/FileLinkMenu';
import { SearchPanel } from './components/SearchPanel';
import { TitleBar } from './components/TitleBar';
import { NoteEditor } from "./components/NoteEditor";
import { Button } from "@/components/ui/button";
import { loadApiKeys } from '@/lib/apiKeys';
import { ApiKeys } from '@/types';
import { Toaster } from '@/components/ui/sonner';

interface ApiResponse {
  content?: string;
  error?: string;
}

// Add type definition at the top
type PreferenceTab = 'api-keys' | 'appearance' | 'models' | 'shortcuts';

// Add this new component for side-by-side comparison
const ComparisonView: React.FC<{
  message: string;
  model1Response: string;
  model2Response: string;
  model1Id: string;
  model2Id: string;
}> = ({ message, model1Response, model2Response, model1Id, model2Id }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="text-sm text-muted-foreground">
        Comparing responses for: "{message}"
      </div>
      <div className="flex gap-4">
        <div className="flex-1 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ModelIcon modelId={model1Id} className="h-4 w-4" />
            <span className="text-sm font-medium">
              {AVAILABLE_MODELS.find(m => m.id === model1Id)?.name}
            </span>
          </div>
          <div className="text-sm">
            {model1Response}
          </div>
        </div>
        <div className="flex-1 border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <ModelIcon modelId={model2Id} className="h-4 w-4" />
            <span className="text-sm font-medium">
              {AVAILABLE_MODELS.find(m => m.id === model2Id)?.name}
            </span>
          </div>
          <div className="text-sm">
            {model2Response}
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => loadActiveThreadId());
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferenceTab, setPreferenceTab] = useState<PreferenceTab>('api-keys');
  const [selectedModel, setSelectedModel] = useState(() => {
    const savedModel = loadSelectedModel();
    return savedModel || AVAILABLE_MODELS[0].id;
  });
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [shortcuts, setShortcuts] = useState<KeyboardShortcut[]>([]);
  const [manuallyHidden, setManuallyHidden] = useState(false);
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [isDiscussing, setIsDiscussing] = useState(false);
  const [shouldStopDiscussion, setShouldStopDiscussion] = useState(false);
  const [isDiscussionPaused, setIsDiscussionPaused] = useState(false);
  const stopDiscussionRef = useRef(false);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [showFileLinkMenu, setShowFileLinkMenu] = useState(false);
  const [fileLinkQuery, setFileLinkQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [noteNavigationStack, setNoteNavigationStack] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'threads' | 'notes'>('threads');

  // Memoize valid threads
  const validThreads = useMemo(() => {
    // Ensure threads is a valid array and validate each thread
    return Array.isArray(threads) ? threads.filter(thread => 
      thread && 
      typeof thread.id === 'string' && 
      typeof thread.isNote === 'boolean'
    ) : [];
  }, [threads]);

  // Log thread counts
  useEffect(() => {
    console.log('Thread counts:', {
      total: validThreads.length,
      notes: validThreads.filter(t => t.isNote).length,
      chats: validThreads.filter(t => !t.isNote).length,
      activeTab
    });
  }, [validThreads, activeTab]);

  // Memoize filtered threads for the current tab
  const filteredThreads = useMemo(() => {
    // Filter threads based on active tab
    const filtered = validThreads.filter(thread => 
      (activeTab === 'notes' ? thread.isNote : !thread.isNote)
    );

    console.log('Filtering threads:', {
      total: validThreads.length,
      filtered: filtered.length,
      notes: validThreads.filter(t => t.isNote).length,
      chats: validThreads.filter(t => !t.isNote).length,
      activeTab
    });
    
    return filtered;
  }, [validThreads, activeTab]);

  // Update handleThreadSelect to handle tab switching
  const handleThreadSelect = useCallback((threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread && typeof thread.isNote === 'boolean') {
      console.log('Selecting thread:', {
        id: threadId,
        isNote: thread.isNote,
        currentTab: activeTab,
        switchingTo: thread.isNote ? 'notes' : 'threads'
      });
      
      // Update the tab based on the thread type
      setActiveTab(thread.isNote ? 'notes' : 'threads');
      // Then set the active thread
      setActiveThreadId(threadId);
    }
  }, [threads, activeTab]);

  // Update handleTabAndThreadChange to handle tab switching
  const handleTabAndThreadChange = useCallback((threadId: string, isNote: boolean) => {
    console.log('Handling tab and thread change:', { 
      threadId, 
      isNote, 
      currentTab: activeTab,
      thread: threads.find(t => t.id === threadId)
    });
    
    // First switch the tab
    setActiveTab(isNote ? 'notes' : 'threads');
    
    // Then select the thread
    setActiveThreadId(threadId);
  }, [threads, activeTab]);

  // Create a memoized version of handleNewThread
  const handleNewThread = useCallback((isNote: boolean = false) => {
    const baseThread = {
      id: nanoid(),
      name: isNote ? 'New Note' : 'New Thread',
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cachedFiles: [],
      linkedNotes: [],
      isPinned: false,
    };

    const newThread: Thread = isNote ? {
      ...baseThread,
      isNote: true,
      content: '',
      parentId: null,
      children: [],
    } : {
      ...baseThread,
      isNote: false,
      messages: [],
      lastUsedModel: selectedModel,
    };
    
    console.log('Creating new thread:', {
      id: newThread.id,
      isNote: newThread.isNote,
      type: isNote ? 'note' : 'chat',
      currentTab: activeTab,
      switchingTo: isNote ? 'notes' : 'threads'
    });

    // Switch to the appropriate tab
    setActiveTab(isNote ? 'notes' : 'threads');
    
    // Add the new thread and set it as active
    setThreads(prev => [newThread, ...prev]);
    setActiveThreadId(newThread.id);
    
    return newThread.id;
  }, [selectedModel, activeTab]);

  const handleNewFolder = useCallback(async () => {
    const newFolder: Thread = {
      id: nanoid(),
      name: "New Folder",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isFolder: true,
      parentId: null,
      children: [],
      files: [],
      cachedFiles: [],
      linkedNotes: [],
      isPinned: false,
      isNote: false,
    };
    
    // Add the new folder at the beginning of the list
    setThreads(prev => [newFolder, ...prev]);
    
    // Start renaming the folder immediately
    // setEditingThreadId(newFolder.id);
    // setEditingName("New Folder");
    
    return newFolder.id;
  }, []);

  const handleReorderThreads = useCallback((newThreads: Thread[]) => {
    // Create a Set of thread IDs from the reordered threads for quick lookup
    const reorderedIds = new Set(newThreads.map(t => t.id));
    
    // Get threads from the current tab that weren't reordered
    const currentTabThreads = threads.filter(
      t => (activeTab === 'notes' ? t.isNote : !t.isNote) && !reorderedIds.has(t.id)
    );
    
    // Combine all threads in the correct order:
    // 1. Reordered threads (maintaining their new order)
    // 2. Any remaining threads from current tab
    // 3. All threads from other tab
    const updatedThreads = [
      ...newThreads,
      ...currentTabThreads,
      ...threads.filter(
        t => (activeTab === 'notes' ? !t.isNote : t.isNote)
      )
    ];

    console.log('Reordering threads:', {
      total: threads.length,
      reordered: newThreads.length,
      currentTab: activeTab,
      currentTabRemaining: currentTabThreads.length,
      otherTab: threads.filter(
        t => (activeTab === 'notes' ? !t.isNote : t.isNote)
      ).length,
      reorderedIds: Array.from(reorderedIds)
    });
    
    setThreads(updatedThreads);
    saveThreadOrder(updatedThreads.map(t => t.id));
  }, [threads, activeTab]);

  // Helper function to get all descendant thread IDs
  const getDescendantIds = useCallback((threadId: string): string[] => {
    const descendants: string[] = [];
    const thread = threads.find(t => t.id === threadId);
    
    if (!thread) return descendants;
    
    // Get immediate children
    const children = threads.filter(t => t.parentId === threadId);
    
    children.forEach(child => {
      descendants.push(child.id);
      // Recursively get descendants of each child
      descendants.push(...getDescendantIds(child.id));
    });
    
    return descendants;
  }, [threads]);

  const handleDeleteThread = useCallback((threadId: string) => {
    // Get all descendant thread IDs
    const descendantIds = getDescendantIds(threadId);
    
    // Delete the thread and all its descendants
    setThreads(prev => prev.filter(t => t.id !== threadId && !descendantIds.includes(t.id)));
    
    // If the deleted thread was active, clear the active thread
    if (activeThreadId === threadId || descendantIds.includes(activeThreadId || '')) {
      setActiveThreadId(null);
    }
    
    // Delete the thread and its descendants from storage
    deleteThread(threadId);
    descendantIds.forEach(id => deleteThread(id));
  }, [activeThreadId, getDescendantIds]);

  // Get active thread
  const activeThread = useMemo(() => {
    return threads.find(t => t.id === activeThreadId);
  }, [threads, activeThreadId]);

  // Initialize cache on mount
  useEffect(() => {
    initializeCache().catch(console.error);
  }, []);

  // Get active thread messages
  const messages = useMemo(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    console.log('Getting messages for thread:', {
      threadId: activeThread?.id,
      messageCount: (activeThread as ChatThread)?.messages?.length || 0,
      isNote: activeThread?.isNote
    });
    
    // Only return messages if we have an active thread and it's not a note
    if (!activeThread || activeThread.isNote) {
      return [];
    }
    
    // Cast to ChatThread since we know it's not a note
    const chatThread = activeThread as ChatThread;
    return [...chatThread.messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [threads, activeThreadId]);

  // Update thread storage when threads change
  useEffect(() => {
    // Only save if there are actual changes
    const savedThreads = loadThreads();
    if (JSON.stringify(savedThreads) !== JSON.stringify(threads)) {
      threads.forEach(thread => saveThread(thread));
      saveThreadOrder(threads.map(t => t.id));
    }
  }, [threads]);

  // Save active thread ID when it changes
  useEffect(() => {
    saveActiveThreadId(activeThreadId);
  }, [activeThreadId]);

  useEffect(() => {
    loadShortcuts().then(loadedShortcuts => {
      setShortcuts(loadedShortcuts);
    }).catch(console.error);
  }, []);

  const clearHistoryShortcut = useMemo(() => {
    return shortcuts.find(s => s.id === 'clear-history')?.currentKey || '⌘/Ctrl + K';
  }, [shortcuts]);

  // Create a memoized version of handleNewNote
  const handleNewNote = useCallback(() => {
    return handleNewThread(true);
  }, [handleNewThread]);

  const handleSendMessage = async (message: string, overrideModel?: string) => {
    console.log('Sending message:', { message, overrideModel, selectedModel });
    setLoading(true);
    
    if (message && activeThreadId) {
      const modelToUse = overrideModel || selectedModel;
      const model = AVAILABLE_MODELS.find(m => m.id === modelToUse);
      
      console.log('Selected model:', { modelToUse, provider: model?.provider });
      
      // Create user message with timestamp and modelId
      const userMessage: Message = { 
        role: 'user', 
        content: message,
        timestamp: Date.now(),
        modelId: modelToUse
      };

      // Update thread with user message
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId && !thread.isNote) {
          const chatThread = thread as ChatThread;
          return {
            ...chatThread,
            messages: [...chatThread.messages, userMessage],
            lastUsedModel: modelToUse,
            updatedAt: Date.now()
          };
        }
        return thread;
      }));

      try {
        console.log('Invoking send_message:', {
          message,
          model: modelToUse,
          provider: model?.provider
        });

        const response = await invoke<ApiResponse>('send_message', {
          request: {
            message,
            model: modelToUse,
            provider: model?.provider
          }
        });

        console.log('Received response:', response);

        if (response.error) {
          console.error('API Error:', response.error);
          // Add error message to thread
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId && !thread.isNote) {
              const chatThread = thread as ChatThread;
              return {
                ...chatThread,
                messages: [...chatThread.messages, {
                  role: 'error',
                  content: response.error,
                  timestamp: Date.now(),
                  modelId: modelToUse
                }],
                updatedAt: Date.now()
              };
            }
            return thread;
          }));
          
          // Show toast notification
          toast({
            title: "Error",
            description: response.error,
            variant: "destructive",
            duration: 5000,
          });
        } else if (response.content) {
          // Add assistant's response to the thread
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId && !thread.isNote) {
              const chatThread = thread as ChatThread;
              return {
                ...chatThread,
                messages: [...chatThread.messages, {
                  role: 'assistant',
                  content: response.content,
                  timestamp: Date.now(),
                  modelId: modelToUse
                }],
                updatedAt: Date.now()
              };
            }
            return thread;
          }));
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to send message",
          variant: "destructive",
        });
      }
    }
    
    setLoading(false);
    // Scroll to bottom after loading is complete
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
  };

  const handleRenameThread = (threadId: string, newName: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          name: newName,
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));
  };

  const handleFileUpload = async (file: File) => {
    try {
      toast({
        title: "Reading file",
        description: `Reading ${file.name}...`,
      });

      let content: string;
      const nativeFile = file as any;
      
      console.log('File object:', {
        file,
        nativeFile,
        type: file.type,
        name: file.name,
        size: file.size,
        path: nativeFile.path,
        webkitRelativePath: file.webkitRelativePath,
      });

      // Check file size (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }

      if (nativeFile.path) {
        // For Tauri drag-and-drop, use the native path
        let filePath = nativeFile.path;
        
        // Handle file:// protocol
        if (filePath.startsWith('file://')) {
          filePath = decodeURIComponent(filePath.replace('file://', ''));
        }
        
        // On macOS, handle spaces in paths
        if (filePath.includes(' ')) {
          filePath = filePath.replace(/ /g, '\\ ');
        }

        console.log('Processing file path:', {
          original: nativeFile.path,
          processed: filePath,
          isAbsolute: filePath.startsWith('/'),
        });
        
        try {
          content = await invoke('handle_file_drop', { path: filePath });
        } catch (error) {
          // If file reading fails, fall back to FileReader
          console.log('Falling back to FileReader');
          content = await getFileHandler(file);
        }
      } else {
        // For regular file input, use the file reader
        content = await getFileHandler(file);
      }

      if (!content) {
        throw new Error('Failed to read file content');
      }

      if (activeThreadId) {
        setThreads(prev => {
          const updatedThreads = prev.map(thread => {
            if (thread.id === activeThreadId) {
              const newFile = {
                id: nanoid(),
                name: file.name,
                content,
                type: file.type,
                timestamp: Date.now()
              };
              
              // Initialize files array if it doesn't exist
              const files = Array.isArray(thread.files) ? thread.files : [];
              
              console.log('Adding file to thread:', {
                threadId: thread.id,
                fileName: file.name,
                currentFiles: files.length,
              });
              
              const updatedThread = {
                ...thread,
                files: [...files, newFile],
                updatedAt: Date.now()
              };

              // Save the thread immediately
              saveThread(updatedThread);
              
              toast({
                title: "Success",
                description: `Successfully uploaded ${file.name}`,
              });

              return updatedThread;
            }
            return thread;
          });

          // Save all threads
          updatedThreads.forEach(thread => {
            if (thread.id === activeThreadId) {
              saveThread(thread);
            }
          });

          return updatedThreads;
        });
      }
    } catch (error) {
      console.error('File read error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to read file',
        variant: "destructive",
      });
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (activeThreadId) {
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            files: thread.files.filter(f => f.cacheId !== fileId),
            cachedFiles: thread.cachedFiles.filter(id => id !== fileId),
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));
    }
  };

  const handleSidebarToggle = () => {
    const newVisibility = !sidebarVisible;
    setSidebarVisible(newVisibility);
    // Only set manuallyHidden when hiding the sidebar
    if (!newVisibility) {
      setManuallyHidden(true);
    }
  };

  useEffect(() => {
    // Function to handle window resize
    const handleResize = () => {
      const windowWidth = window.innerWidth;
      
      if (windowWidth < 700) {
        // Always hide when window is too small
        setSidebarVisible(false);
        setManuallyHidden(false); // Reset manual state when auto-hiding
      } else if (windowWidth >= 700 && !manuallyHidden) {
        // Only show if it wasn't manually hidden
        setSidebarVisible(true);
      }
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [manuallyHidden]); // Add manuallyHidden to dependencies

  useEffect(() => {
    saveSelectedModel(selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    loadPlugins().then(setPlugins);
  }, []);

  // Update handleKnowledgeGraphNodeClick to use handleTabAndThreadChange
  const handleKnowledgeGraphNodeClick = useCallback((threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      handleTabAndThreadChange(threadId, thread.isNote);
    }
  }, [threads, handleTabAndThreadChange]);

  const clearCurrentThread = () => {
    if (activeThreadId) {
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId && !thread.isNote) { // Add check for non-note threads
          return {
            ...thread,
            messages: [], // Only clear messages
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));
    }
  };

  const handleCompareModels = async (message: string, model1Id: string, model2Id: string) => {
    console.log('handleCompareModels starting:', { message, model1Id, model2Id });
    setLoading(true);

    if (!activeThreadId) {
      console.log('No active thread, creating new one');
      handleNewThread();
    }

    // Add user message
    const userMessage: Message = { 
      role: 'user', 
      content: message,
      timestamp: Date.now(),
      modelId: model1Id  // Use model1Id as the primary model for the user message
    };

    setThreads(prev => prev.map(thread => {
      if (thread.id === activeThreadId) {
        return {
          ...thread,
          messages: [...thread.messages, userMessage],
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));

    try {
      const model1 = AVAILABLE_MODELS.find(m => m.id === model1Id);
      const model2 = AVAILABLE_MODELS.find(m => m.id === model2Id);
      
      console.log('Using models:', { model1, model2 });
      
      if (!model1 || !model2) throw new Error('Invalid model selected');

      // Send to first model
      console.log('Sending to first model:', model1Id);
      const response1 = await invoke<ApiResponse>('send_message', {
        request: {
          message,
          model: model1Id,
          provider: model1.provider
        }
      });

      // Send to second model
      console.log('Sending to second model:', model2Id);
      const response2 = await invoke<ApiResponse>('send_message', {
        request: {
          message,
          model: model2Id,
          provider: model2.provider
        }
      });

      console.log('Got responses:', { response1, response2 });

      if (response1.error || response2.error) {
        const errorMessage = response1.error || response2.error;
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: [...thread.messages, { role: 'error', content: errorMessage! }],
              updatedAt: Date.now(),
            };
          }
          return thread;
        }));
      } else if (response1.content && response2.content) {
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: [...thread.messages, {
                role: 'comparison',
                content: message,
                comparison: {
                  message,
                  model1: { id: model1Id, response: response1.content },
                  model2: { id: model2Id, response: response2.content }
                }
              }],
              updatedAt: Date.now(),
            };
          }
          return thread;
        }));
      }
    } catch (error) {
      console.error('Failed to compare models:', error);
      toast({
        variant: "destructive",
        description: "Failed to compare models",
        duration: 2000,
      });
    }

    setLoading(false);
    // Scroll to bottom after loading is complete
    requestAnimationFrame(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    });
  };

  const handleStartDiscussion = async (message: string, model1Id: string, model2Id: string) => {
    setIsDiscussing(true);
    setIsDiscussionPaused(false);
    setShouldStopDiscussion(false);
    stopDiscussionRef.current = false;
    setLoading(true);

    if (!activeThreadId) {
      handleNewThread();
    }

    // Add initial user message
    const userMessage: Message = { 
      role: 'user', 
      content: message
    };

    setThreads(prev => prev.map(thread => {
      if (thread.id === activeThreadId) {
        return {
          ...thread,
          messages: [...thread.messages, userMessage],
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));

    let currentMessage = message;
    let currentRound = 0;
    const MAX_ROUNDS = 5;

    const wait = (ms: number) => new Promise<void>((resolve) => {
      console.log(`Waiting ${ms}ms before next message...`);
      const timeoutId = setTimeout(resolve, ms);
      const checkInterval = setInterval(() => {
        if (stopDiscussionRef.current) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    const stopDiscussion = () => {
      stopDiscussionRef.current = true;
      setShouldStopDiscussion(true);
      setIsDiscussing(false);
      setLoading(false);
      
      // Add system message about stopping
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            messages: [...thread.messages, {
              role: 'system',
              content: 'Discussion stopped by user'
            }],
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));
    };

    try {
      while (currentRound < MAX_ROUNDS && !stopDiscussionRef.current) {
        if (stopDiscussionRef.current) break;

        // Model 1's turn
        const model1 = AVAILABLE_MODELS.find(m => m.id === model1Id);
        if (!model1) throw new Error('Invalid model 1 selected');

        if (stopDiscussionRef.current) break;

        const response1 = await invoke<ApiResponse>('send_message', {
          request: {
            message: currentMessage,
            model: model1Id,
            provider: model1.provider
          }
        });

        if (stopDiscussionRef.current) break;
        if (response1.error) break;

        // Add Model 1's response
        const model1Response: Message = {
          role: 'assistant',
          content: response1.content,
          timestamp: Date.now(),
          modelId: model1Id
        };
        
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: [...thread.messages, model1Response],
              updatedAt: Date.now(),
            };
          }
          return thread;
        }));

        // Mandatory wait after Model 1's response
        if (!stopDiscussionRef.current) {
          await wait(5000);
        }

        if (stopDiscussionRef.current) break;

        // Model 2's turn
        const model2 = AVAILABLE_MODELS.find(m => m.id === model2Id);
        if (!model2) throw new Error('Invalid model 2 selected');

        if (stopDiscussionRef.current) break;

        const response2 = await invoke<ApiResponse>('send_message', {
          request: {
            message: response1.content!,
            model: model2Id,
            provider: model2.provider
          }
        });

        if (stopDiscussionRef.current) break;
        if (response2.error) break;

        // Add Model 2's response
        const model2Response: Message = {
          role: 'assistant',
          content: response2.content,
          timestamp: Date.now(),
          modelId: model2Id
        };
        
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: [...thread.messages, model2Response],
              updatedAt: Date.now(),
            };
          }
          return thread;
        }));

        currentMessage = response2.content!;
        currentRound++;

        // Mandatory wait after Model 2's response before next round
        if (!stopDiscussionRef.current && currentRound < MAX_ROUNDS) {
          await wait(5000);
        }
      }
    } catch (error) {
      console.error('Failed during discussion:', error);
      toast({
        variant: "destructive",
        description: "Failed during model discussion",
        duration: 2000,
      });
    } finally {
      setIsDiscussing(false);
      setShouldStopDiscussion(false);
      stopDiscussionRef.current = false;
      setLoading(false);
      // Scroll to bottom after loading is complete
      requestAnimationFrame(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
      });
    }
  };

  const handleStopDiscussion = () => {
    stopDiscussionRef.current = true;
    setShouldStopDiscussion(true);
  };

  const handleTogglePin = (threadId: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          isPinned: !thread.isPinned,
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));
  };

  const handleColorChange = (threadId: string, color: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          color: color || undefined,
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));
  };

  const handleIconChange = (threadId: string, icon: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          icon: icon || undefined,
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));
  };

  const handleTextColorChange = (threadId: string, color: string) => {
    setThreads(prev => prev.map(thread => {
      if (thread.id === threadId) {
        return {
          ...thread,
          textColor: color || undefined,
          updatedAt: Date.now(),
        };
      }
      return thread;
    }));
  };

  const handleNoteUpdate = (updatedNote: NoteThread) => {
    console.log('Updating note:', {
      id: updatedNote.id,
      name: updatedNote.name,
      contentLength: updatedNote.content.length,
      content: updatedNote.content.slice(0, 50) + '...',
      linkedNotes: updatedNote.linkedNotes
    });

    setThreads(prev => prev.map(thread => 
      thread.id === updatedNote.id 
        ? {
            ...thread,
            ...updatedNote,
            linkedNotes: updatedNote.linkedNotes || [],
            content: updatedNote.content,
            updatedAt: Date.now()
          }
        : thread
    ));
  };

  useEffect(() => {
    if (activeThreadId) {
      // setView(activeThread?.isNote ? 'note' : 'thread');
    }
  }, [activeThreadId, activeThread?.isNote]);

  const handleCreateNote = (name: string) => {
    const newNote: NoteThread = {
      id: nanoid(),
      name: name,
      isNote: true,
      content: '',
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cachedFiles: [],
      linkedNotes: [],
      parentId: null,
      children: [],
      isPinned: false,
    };
    setThreads(prev => [newNote, ...prev]);
    setActiveThreadId(newNote.id);
    setActiveTab('notes');
  };

  const handleShowFileLinkMenu = () => {
    setShowFileLinkMenu(true);
    setFileLinkQuery('');
  };

  const handleFileLinkSelect = (fileName: string) => {
    if (activeThread?.isNote) {
      // Update note content with the file link
      const newContent = activeThread.content + `[[${fileName}]]`;
      const updatedNote: NoteThread = {
        ...activeThread,
        content: newContent,
        updatedAt: Date.now()
      };
      handleNoteUpdate(updatedNote);
    }
    setShowFileLinkMenu(false);
  };

  // Add event listener for note selection
  useEffect(() => {
    const handleSelectNote = (event: CustomEvent<{ noteId: string, switchTab: boolean }>) => {
      const { noteId, switchTab } = event.detail;
      if (switchTab) {
        setActiveTab('notes');
      }
      setActiveThreadId(noteId);
    };

    window.addEventListener('select-note', handleSelectNote as EventListener);
    return () => {
      window.removeEventListener('select-note', handleSelectNote as EventListener);
    };
  }, []);

  // Handle note navigation from wiki-links
  useEffect(() => {
    const handleSelectNote = (event: CustomEvent<{ noteId: string }>) => {
      const { noteId } = event.detail;
      
      // Add current note to history before switching
      if (activeThreadId && threads.find(t => t.id === activeThreadId)?.isNote) {
        setNoteNavigationStack(prev => [...prev, activeThreadId]);
      }
      
      setActiveThreadId(noteId);
    };

    window.addEventListener('select-note', handleSelectNote as any);
    return () => window.removeEventListener('select-note', handleSelectNote as any);
  }, [activeThreadId, threads]);

  // Clear navigation stack when closing notes
  useEffect(() => {
    if (!activeThreadId || !threads.find(t => t.id === activeThreadId)?.isNote) {
      setNoteNavigationStack([]);
    }
  }, [activeThreadId, threads]);

  // Handle back navigation
  const handleNavigateBack = () => {
    if (noteNavigationStack.length > 0) {
      // Get the last note from history
      const newStack = [...noteNavigationStack];
      const lastNoteId = newStack.pop();
      setNoteNavigationStack(newStack);
      
      if (lastNoteId) {
        setActiveThreadId(lastNoteId);
      }
    }
  };

  // Add effect to handle search shortcut
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Load current shortcuts
      const currentShortcuts = await loadShortcuts();
      
      // Find search shortcut
      const searchShortcut = currentShortcuts.find(s => s.id === 'search');
      
      if (searchShortcut && matchesShortcut(e, searchShortcut)) {
        e.preventDefault();
        setShowSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown as unknown as EventListener);
    return () => window.removeEventListener('keydown', handleKeyDown as unknown as EventListener);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Don't trigger shortcuts if we're in an input or contenteditable
      if (e.target instanceof HTMLElement && 
         (e.target.tagName === 'INPUT' || 
          e.target.tagName === 'TEXTAREA' || 
          e.target.isContentEditable)) {
        return;
      }

      // Load current shortcuts
      const currentShortcuts = shortcuts;
      
      for (const shortcut of currentShortcuts) {
        if (matchesShortcut(e, shortcut)) {
          e.preventDefault();
          
          switch (shortcut.id) {
            case 'search':
              setShowSearch(true);
              break;
            case 'clear-history':
              if (activeThread && !activeThread.isNote) {
                const chatThread = activeThread as ChatThread;
                setThreads(prev => prev.map(t => 
                  t.id === activeThreadId 
                    ? { ...chatThread, messages: [] }
                    : t
                ));
              }
              break;
            case 'toggle-sidebar':
              setSidebarVisible(prev => !prev);
              break;
            case 'new-note':
              handleNewNote();
              break;
            case 'new-thread':
              handleNewThread();
              break;
            case 'delete-thread':
              if (activeThreadId) {
                setThreadToDelete(activeThreadId);
                setShowDeleteConfirm(true);
              }
              break;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, activeThreadId, activeThread, handleNewNote, handleNewThread]);

  const handleDeleteKeyPress = useCallback((e: KeyboardEvent) => {
    console.log('Key pressed:', e.key, 'Ctrl/Cmd:', e.metaKey || e.ctrlKey);

    if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) {
      console.log('Delete shortcut triggered');
      e.preventDefault();
      e.stopPropagation();

      if (activeThreadId) {
        console.log('Active thread found:', activeThreadId);
        setThreadToDelete(activeThreadId);
        setShowDeleteConfirm(true);
      }
    }
  }, [activeThreadId]);

  // Add keyboard shortcut effect
  useEffect(() => {
    window.addEventListener('keydown', handleDeleteKeyPress as unknown as EventListener);
    return () => window.removeEventListener('keydown', handleDeleteKeyPress as unknown as EventListener);
  }, [handleDeleteKeyPress]);

  // Add delete confirmation handler
  const handleDeleteConfirm = useCallback(() => {
    if (threadToDelete) {
      handleDeleteThread(threadToDelete);
      setThreadToDelete(null);
      setShowDeleteConfirm(false);
    }
  }, [threadToDelete, handleDeleteThread]);

  const handleLinkNotes = (sourceNoteId: string, targetNoteId: string) => {
    console.log('Linking notes:', { sourceNoteId, targetNoteId });
    
    setThreads(prev => {
      const updatedThreads = prev.map(thread => {
        if (thread.id === sourceNoteId) {
          const currentLinks = thread.linkedNotes || [];
          const newLinks = Array.from(new Set([...currentLinks, targetNoteId]));
          console.log(`Updating source note ${thread.name}:`, { currentLinks, newLinks });
          return {
            ...thread,
            linkedNotes: newLinks,
            updatedAt: Date.now(),
          };
        }
        if (thread.id === targetNoteId) {
          const currentLinks = thread.linkedNotes || [];
          const newLinks = Array.from(new Set([...currentLinks, sourceNoteId]));
          console.log(`Updating target note ${thread.name}:`, { currentLinks, newLinks });
          return {
            ...thread,
            linkedNotes: newLinks,
            updatedAt: Date.now(),
          };
        }
        return thread;
      });

      // Save each updated thread
      updatedThreads.forEach(thread => {
        if (thread.id === sourceNoteId || thread.id === targetNoteId) {
          saveThread(thread);
        }
      });

      return updatedThreads;
    });
  };

  // Load API keys on mount
  useEffect(() => {
    const loadKeys = async () => {
      const keys = await loadApiKeys();
      setApiKeys(keys);
    };
    loadKeys();
  }, []);

  useEffect(() => {
    if (!showPreferences) {
      loadApiKeys().then(setApiKeys);
    }
  }, [showPreferences]);

  const verifyApiKey = async (type: keyof ApiKeys, key: string) => {
    try {
      console.log(`Verifying ${type} API key:`, {
        keyLength: key?.length,
        hasKey: !!key,
        keyStart: key?.slice(0, 4)
      });

      setVerificationStatus(prev => ({
        ...prev,
        [type]: 'verifying'
      }));

      // Simple test message for verification
      const testMessage = "Hello, this is a test message to verify the API key.";

      switch (type) {
        case 'anthropic':
          const anthropicResponse = await invoke('send_message', {
            request: {
              message: testMessage,
              model: 'claude-3-sonnet-20240229',
              provider: 'anthropic'
            }
          });

          if ('error' in anthropicResponse) {
            throw new Error(anthropicResponse.error);
          }

          setVerificationStatus(prev => ({
            ...prev,
            [type]: 'success'
          }));
          break;

        case 'perplexity':
          const perplexityResponse = await invoke('send_message', {
            request: {
              message: testMessage,
              model: 'llama-3.1-sonar-small-128k-online',
              provider: 'perplexity'
            }
          });

          if ('error' in perplexityResponse) {
            throw new Error(perplexityResponse.error);
          }

          setVerificationStatus(prev => ({
            ...prev,
            [type]: 'success'
          }));
          break;

        case 'openai':
          const openaiResponse = await invoke('send_message', {
            request: {
              message: testMessage,
              model: 'gpt-3.5-turbo-0125',
              provider: 'openai'
            }
          });

          if ('error' in openaiResponse) {
            throw new Error(openaiResponse.error);
          }

          setVerificationStatus(prev => ({
            ...prev,
            [type]: 'success'
          }));
          break;

        case 'xai':
          const xaiResponse = await invoke('send_message', {
            request: {
              message: testMessage,
              model: 'grok-beta',
              provider: 'xai'
            }
          });

          if ('error' in xaiResponse) {
            throw new Error(xaiResponse.error);
          }

          setVerificationStatus(prev => ({
            ...prev,
            [type]: 'success'
          }));
          break;

        case 'google':
          const googleResponse = await invoke('send_message', {
            request: {
              message: testMessage,
              model: 'gemini-1.0-pro',
              provider: 'google'
            }
          });

          if ('error' in googleResponse) {
            throw new Error(googleResponse.error);
          }

          setVerificationStatus(prev => ({
            ...prev,
            [type]: 'success'
          }));
          break;

        default:
          throw new Error(`Unknown provider: ${type}`);
      }

      return null;
    } catch (error) {
      console.error(`Failed to verify ${type} API key:`, error);
      setVerificationStatus(prev => ({
        ...prev,
        [type]: 'error'
      }));
      return error instanceof Error ? error.message : 'Unknown error occurred';
    }
  };

  // Update the handler function
  const handleSplitToNote = (sourceNoteId: string, text: string) => {
    // Create new note with selected text
    const newNoteId = handleNewThread(true);
    
    // Update the new note's content
    setThreads(prev => prev.map(thread => {
      if (thread.id === newNoteId) {
        return {
          ...thread,
          content: text,
          updatedAt: Date.now()
        };
      }
      // Remove the selected text from the source note
      if (thread.id === sourceNoteId) {
        const sourceNote = thread as NoteThread;
        const newContent = sourceNote.content.replace(text, '');
        // Clean up any double newlines that might have been created
        const cleanedContent = newContent.replace(/\n{3,}/g, '\n\n').trim();
        return {
          ...thread,
          content: cleanedContent,
          updatedAt: Date.now()
        };
      }
      return thread;
    }));

    // Link the notes together
    handleLinkNotes(sourceNoteId, newNoteId);
    
    // Switch to the new note
    setActiveThreadId(newNoteId);
  };

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    async function setupListener() {
      try {
        const unlisten = await listen("keyboard-permission-needed", () => {
          toast({
            title: "Keyboard Access Required",
            description: "Please grant keyboard access permissions in System Settings > Privacy & Security > Accessibility",
            variant: "destructive",
            duration: 10000,
          });
        });
        cleanup = unlisten;
      } catch (error) {
        console.error("Failed to setup keyboard permission listener:", error);
      }
    }

    setupListener();

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  const [preferencesTab, setPreferencesTab] = useState<string>('profile');

  const handleShowPreferences = (tab?: string) => {
    setPreferencesTab(tab || 'profile');
    setShowPreferences(true);
  };

  const handleHidePreferences = useCallback(() => {
    setShowPreferences(false);
  }, []);

  useEffect(() => {
    // Save thread whenever it changes
    if (activeThreadId) {
      const thread = threads.find(t => t.id === activeThreadId);
      if (thread) {
        saveThread(thread);
      }
    }
  }, [threads, activeThreadId]);

  useEffect(() => {
    // Save all threads when they change
    threads.forEach(thread => {
      saveThread(thread);
    });
  }, [threads]);

  // Fork a chat message to a new note
  const handleForkToNote = useCallback((content: string) => {
    // Create a new note thread
    const noteId = handleNewThread(true);
    
    // Update the note's content with the message
    setThreads(prev => prev.map(thread => {
      if (thread.id === noteId && thread.isNote) {
        const noteThread = thread as NoteThread;
        return {
          ...noteThread,
          name: 'New Note',
          content,
          updatedAt: Date.now()
        };
      }
      return thread;
    }));

    // Switch to notes tab and select the new note
    setActiveTab('notes');
    setActiveThreadId(noteId);

    // Show success toast
    toast({
      title: "Note Created",
      description: "Message has been converted to a new note",
      variant: "default",
      duration: 2000,
    });

    return noteId;
  }, [handleNewThread]);

  const handleShortcutsChange = useCallback(async (newShortcuts: KeyboardShortcut[]) => {
    try {
      await saveShortcuts(newShortcuts);
      setShortcuts(newShortcuts);
    } catch (error) {
      console.error('Failed to save shortcuts:', error);
    }
  }, []);

  return (
    <>
      <div className="flex h-screen bg-background overflow-hidden rounded-xl">
        <TitleBar onPreferencesClick={handleShowPreferences} />
        <div className="relative bg-background/50 flex h-[calc(100vh-2rem)] w-full mt-8">
          {/* Sidebar with animation */}
          <motion.div
            initial={false}
            animate={{
              width: sidebarVisible ? Math.max(250, sidebarWidth) : '0px',
              opacity: sidebarVisible ? 1 : 0,
            }}
            transition={{ duration: 0.2 }}
            className="relative shrink-0"
            style={{
              minWidth: sidebarVisible ? '250px' : '0px',
            }}
          >
            {sidebarVisible && (
              <ResizeObserver
                onResize={(entry) => {
                  const width = entry.contentRect.width;
                  
                  if (width < 250 || window.innerWidth < 500) {
                    setSidebarVisible(false);
                  }
                }}
              >
                <div className="h-full relative" style={{ width: '100%' }}>
                  <Sidebar
                    threads={validThreads}
                    activeThreadId={activeThreadId}
                    onThreadSelect={handleThreadSelect}
                    onNewThread={() => handleNewThread(false)}
                    onNewNote={() => handleNewThread(true)}
                    onNewFolder={handleNewFolder}
                    onDeleteThread={handleDeleteThread}
                    onRenameThread={handleRenameThread}
                    onReorderThreads={handleReorderThreads}
                    onTogglePin={handleTogglePin}
                    onColorChange={handleColorChange}
                    onIconChange={handleIconChange}
                    onTextColorChange={handleTextColorChange}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                  />
                  <Footer
                    files={activeThread?.files || []}
                    threads={threads}
                    onFileSelect={handleFileUpload}
                    onFileDelete={handleFileDelete}
                    onShowSearch={() => setShowSearch(true)}
                    onShowPreferences={() => setShowPreferences(true)}
                    onShowPreferencesTab={setPreferenceTab}
                    onTabChange={setActiveTab}
                    onSelectNode={handleTabAndThreadChange}
                  />
                </div>
              </ResizeObserver>
            )}
          </motion.div>

          {/* Main content */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex flex-col h-full relative">
              <main 
                ref={chatContainerRef}
                className={cn(
                  "flex-1 overflow-y-auto min-w-0",
                  "transition-spacing duration-200", 
                  !activeThread?.isNote && "flex flex-col h-full mt-12 mx-3 rounded-xl"
                )}
                onClick={(e) => e.stopPropagation()}
              >
                {activeThread && !activeThread.isNote && (
                  <ThreadHeader
                    thread={activeThread}
                    onRename={(newName) => handleRenameThread(activeThread.id, newName)}
                    onIconChange={(newIcon) => handleIconChange(activeThread.id, newIcon)}
                    onOpenModelSelect={() => {
                      setPreferenceTab('models');
                      setShowPreferences(true);
                    }}
                    selectedModel={selectedModel}
                  />
                )}
                {activeThread ? (
                  activeThread.isNote ? (
                    <NoteEditor 
                      note={activeThread as NoteThread}
                      onUpdate={handleNoteUpdate}
                      initialContent={activeThread.content}
                      allNotes={threads.filter((t): t is NoteThread => t.isNote === true)}
                      onNavigateBack={handleNavigateBack}
                      navigationStack={noteNavigationStack}
                      onLinkNotes={handleLinkNotes}
                      onNavigateToNote={(noteId) => {
                        setActiveThreadId(noteId);
                        setNoteNavigationStack(prev => [...prev, activeThreadId!]);
                      }}
                      allThreads={threads}
                      selectedModel={selectedModel}
                      showTTS={!!apiKeys.elevenlabs}
                      onSplitToNote={handleSplitToNote}
                      onForkToNote={handleForkToNote}
                    />
                  ) : (
                    <ChatView
                      messages={messages}
                      loading={loading}
                      clearHistoryShortcut={clearHistoryShortcut}
                      isDiscussing={isDiscussing}
                      selectedModel={selectedModel}
                      isDiscussionPaused={isDiscussionPaused}
                      apiKeys={apiKeys}
                      activeThreadId={activeThreadId}
                      setThreads={setThreads}
                      onStopDiscussion={handleStopDiscussion}
                      onOpenModelSelect={() => {
                        setPreferenceTab('models');
                        setShowPreferences(true);
                      }}
                      onSendMessage={handleSendMessage}
                      onCompareModels={handleCompareModels}
                      onStartDiscussion={handleStartDiscussion}
                      onClearThread={clearCurrentThread}
                      onShowPreferences={handleShowPreferences}
                      allThreads={threads}
                      onForkToNote={handleForkToNote}
                    />
                  )
                ) : (
                  <div className="text-center text-muted-foreground/40 mt-1 text-sm tracking-tighter">
                    Select a thread or note to begin
                  </div>
                )}
              </main>
            </div>
          </div>

          <Preferences
            isOpen={showPreferences}
            onClose={() => setShowPreferences(false)}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            initialTab={preferenceTab}
            plugins={plugins}
            onPluginChange={setPlugins}
            apiKeys={apiKeys}
            shortcuts={shortcuts}
            onShortcutsChange={handleShortcutsChange}
          />

          {/* Add FilePreview dialog */}
          {showFilePreview && previewFile && (
            <Dialog open={showFilePreview} onOpenChange={setShowFilePreview}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{previewFile.name}</DialogTitle>
                </DialogHeader>
                <FilePreview
                  fileName={previewFile.name}
                  content={previewFile.content}
                  showToggle={false}
                  defaultExpanded={true}
                />
              </DialogContent>
            </Dialog>
          )}

          {/* Add FileLinkMenu dialog */}
          {showFileLinkMenu && activeThread?.isNote && (
            <Dialog open={showFileLinkMenu} onOpenChange={setShowFileLinkMenu}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Link File</DialogTitle>
                </DialogHeader>
                <FileLinkMenu
                  query={fileLinkQuery}
                  files={activeThread.files}
                  onSelect={handleFileLinkSelect}
                  onClose={() => setShowFileLinkMenu(false)}
                />
              </DialogContent>
            </Dialog>
          )}

          {showSearch && (
            <SearchPanel
              threads={threads}
              onClose={() => setShowSearch(false)}
              onThreadSelect={(threadId) => {
                const thread = threads.find(t => t.id === threadId);
                if (thread) {
                  setActiveThreadId(threadId);
                  // setView(thread.isNote ? 'note' : 'thread');
                }
                setShowSearch(false);
              }}
            />
          )}

          {/* Delete confirmation dialog */}
          <Dialog 
            open={showDeleteConfirm} 
            onOpenChange={(open) => {
              if (!open) {
                setThreadToDelete(null);
                setShowDeleteConfirm(false);
              }
            }}
          >
            <DialogContent onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleDeleteConfirm();
              }
            }}>
              <DialogHeader>
                <DialogTitle>
                  Delete {threads.find(t => t.id === threadToDelete)?.isNote ? 'Note' : 'Thread'}
                </DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete this {threads.find(t => t.id === threadToDelete)?.isNote ? 'note' : 'thread'}? 
                This action cannot be undone.
              </p>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setThreadToDelete(null);
                    setShowDeleteConfirm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteConfirm}
                  autoFocus
                >
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Toaster 
        position="bottom-right"
        className="!bg-background !opacity-100 !backdrop-blur-sm !rounded-xl !shadow-lg"
        theme="system"
      />
    </>
  );
}

export default App;
