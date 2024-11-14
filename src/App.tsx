import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
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
import { Message, Thread, NoteThread } from '@/types';
import { initializeCache } from '@/lib/fileCache';
import { KeyboardShortcut, loadShortcuts, matchesShortcut } from '@/lib/shortcuts';
import { Footer } from './components/Footer';
import { ResizeObserver } from './components/ResizeObserver';
import { Plugin, loadPlugins } from '@/lib/plugins';
import { ThreadHeader } from './components/ThreadHeader';
import { cn } from '@/lib/utils';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { KnowledgeGraph } from './components/KnowledgeGraph';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileLinkMenu } from './components/FileLinkMenu';
import { SearchPanel } from './components/SearchPanel';
import { TitleBar } from './components/TitleBar';
import { NoteEditor } from "./components/NoteEditor";
import { Button } from "@/components/ui/button";
import { loadApiKeys } from '@/lib/apiKeys';
import { ApiKeys } from '@/types';

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
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [view, setView] = useState<'thread' | 'note' | 'graph'>('thread');
  const [showFilePreview, setShowFilePreview] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileAttachment | null>(null);
  const [showFileLinkMenu, setShowFileLinkMenu] = useState(false);
  const [fileLinkQuery, setFileLinkQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [noteNavigationStack, setNoteNavigationStack] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [threadToDelete, setThreadToDelete] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});

  // Initialize cache on mount
  useEffect(() => {
    initializeCache().catch(console.error);
  }, []);

  // Get active thread messages
  const messages = useMemo(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    console.log('Getting messages for thread:', {
      threadId: activeThread?.id,
      messageCount: activeThread?.messages?.length || 0,
      isNote: activeThread?.isNote
    });
    
    // Only return messages if we have an active thread and it's not a note
    if (!activeThread || activeThread.isNote) {
      return [];
    }
    
    // Ensure we're returning a new array to avoid reference issues
    return [...activeThread.messages].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
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
    loadShortcuts().then(setShortcuts);
  }, []);

  const clearHistoryShortcut = useMemo(() => {
    return shortcuts.find(s => s.id === 'clear-history')?.currentKey || '⌘/Ctrl + K';
  }, [shortcuts]);

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
      messageCount: isNote ? undefined : 0
    });
    
    // Add the new thread to the beginning of the list
    setThreads(prev => {
      const updatedThreads = [newThread, ...prev];
      console.log('Updated threads:', updatedThreads.map(t => ({
        id: t.id,
        name: t.name,
        isNote: t.isNote,
        type: t.isNote ? 'note' : 'chat'
      })));
      return updatedThreads;
    });

    // Set the active thread ID after the state update
    setActiveThreadId(newThread.id);
    setView(isNote ? 'note' : 'thread');

    // Save the new thread
    saveThread(newThread);

    return newThread.id;
  }, [selectedModel]);

  // Create a memoized version of handleNewNote
  const handleNewNote = useCallback(() => {
    handleNewThread(true);
  }, [handleNewThread]);

  const handleDeleteThread = (threadId: string) => {
    setThreads(prev => {
      const remaining = prev.filter(t => t.id !== threadId);
      deleteThread(threadId);
      return remaining;
    });
    
    if (activeThreadId === threadId) {
      const remainingThreads = threads.filter(t => t.id !== threadId);
      setActiveThreadId(remainingThreads[0]?.id || null);
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Update the keyboard shortcut effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for delete shortcut (Cmd/Ctrl + Backspace)
      if ((e.metaKey || e.ctrlKey) && e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        
        if (activeThreadId) {
          const thread = threads.find(t => t.id === activeThreadId);
          if (thread) {
            setThreadToDelete(activeThreadId);
            setShowDeleteConfirm(true);
          }
        }
        return;
      }

      // Handle other shortcuts
      loadShortcuts().then(currentShortcuts => {
        const clearHistoryShortcut = currentShortcuts.find(s => s.id === 'clear-history');
        const toggleSidebarShortcut = currentShortcuts.find(s => s.id === 'toggle-sidebar');
        const searchShortcut = currentShortcuts.find(s => s.id === 'search');
        const newNoteShortcut = currentShortcuts.find(s => s.id === 'new-note');
        const newThreadShortcut = currentShortcuts.find(s => s.id === 'new-thread');

        if (clearHistoryShortcut && matchesShortcut(e, clearHistoryShortcut)) {
          e.preventDefault();
          if (activeThreadId) {
            clearCurrentThread();
          }
        }

        if (toggleSidebarShortcut && matchesShortcut(e, toggleSidebarShortcut)) {
          e.preventDefault();
          setSidebarVisible(!sidebarVisible);
        }

        if (searchShortcut && matchesShortcut(e, searchShortcut)) {
          e.preventDefault();
          setShowSearch(true);
        }

        // Add handler for new note shortcut
        if (newNoteShortcut && matchesShortcut(e, newNoteShortcut)) {
          e.preventDefault();
          handleNewNote();
          // Switch to notes tab
          window.dispatchEvent(new CustomEvent('switch-tab', {
            detail: { tab: 'notes' }
          }));
        }

        // Add handler for new thread shortcut
        if (newThreadShortcut && matchesShortcut(e, newThreadShortcut)) {
          e.preventDefault();
          e.stopPropagation();
          
          // Create new thread and get its ID
          const newThreadId = handleNewThread(false);
          
          // Switch to threads tab
          window.dispatchEvent(new CustomEvent('switch-tab', {
            detail: { tab: 'threads' }
          }));
          
          // Set view and active thread
          setView('thread');
          setActiveThreadId(newThreadId);
        }
      });
    };

    // Add the event listener to the window
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [
    activeThreadId,
    threads,
    handleNewThread,
    handleNewNote,
    setView,
    setActiveThreadId,
    setThreadToDelete,
    setShowDeleteConfirm
  ]); // Add all necessary dependencies

  const handleSendMessage = async (message: string, overrideModel?: string) => {
    setLoading(true);
    
    if (message && activeThreadId) {
      const modelToUse = overrideModel || selectedModel;
      
      // Create user message with timestamp
      const userMessage: Message = { 
        role: 'user', 
        content: message,
        timestamp: Date.now()
      };

      // Update thread with user message
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
          console.log('Adding message to thread:', {
            threadId: thread.id,
            messageContent: message.slice(0, 50)
          });
          return {
            ...thread,
            messages: [...thread.messages, userMessage],
            lastUsedModel: modelToUse,
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));

      try {
        const model = AVAILABLE_MODELS.find(m => m.id === modelToUse);
        if (!model) throw new Error('Invalid model selected');

        const response = await invoke<ApiResponse>('send_message', {
          request: {
            message,
            model: modelToUse,
            provider: model.provider
          }
        });
        
        if (response.error) {
          // Add error message with timestamp
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId) {
              return {
                ...thread,
                messages: [...thread.messages, { 
                  role: 'error', 
                  content: response.error!,
                  timestamp: Date.now()
                }],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
        } else if (response.content) {
          // Add assistant message with timestamp
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId && !thread.isNote) {
              return {
                ...thread,
                messages: [...thread.messages, { 
                  role: 'assistant', 
                  content: response.content!,
                  modelId: modelToUse,
                  citations: response.citations,
                  isAudioResponse: response.content.startsWith('data:audio/'),
                  timestamp: Date.now()
                }],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
        }
      } catch (error) {
        console.error('Failed to send message:', error);
        toast({
          variant: "destructive",
          description: "Failed to send message",
          duration: 2000,
        });
      }
    }

    setLoading(false);
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

  const handleReorderThreads = (newThreads: Thread[]) => {
    setThreads(newThreads);
    saveThreadOrder(newThreads.map(t => t.id));
  };

  // Get active thread
  const activeThread = useMemo(() => {
    return threads.find(t => t.id === activeThreadId);
  }, [threads, activeThreadId]);

  // Fix handleFileUpload function
  const handleFileUpload = async (file: File) => {
    try {
      let content: string;
      const nativeFile = file as any;
      
      if (nativeFile.path) {
        content = await invoke('handle_file_drop', { path: nativeFile.path });
      } else {
        content = await getFileHandler(file);
      }

      if (activeThreadId) {
        handleSendMessage(content);
      }
    } catch (error) {
      console.error('File read error:', error);
      toast({
        variant: "destructive",
        description: "Failed to read file content",
        duration: 2000,
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

  // Add new state to track active tab
  const [activeTab, setActiveTab] = useState<'threads' | 'notes'>('threads');

  // Update handleThreadSelect to also set the active tab
  const handleThreadSelect = (threadId: string) => {
    setActiveThreadId(threadId);
    
    // Find the thread
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      // Set the active tab based on thread type
      setActiveTab(thread.isNote ? 'notes' : 'threads');
      
      if (!thread.isNote) {
        // For chat threads, handle model selection
        const lastModelMessage = thread.messages
          .reverse()
          .find(m => m.modelId);

        if (lastModelMessage?.modelId) {
          const modelExists = AVAILABLE_MODELS.some(m => m.id === lastModelMessage.modelId);
          if (modelExists) {
            setSelectedModel(lastModelMessage.modelId);
          }
        } else if (thread.lastUsedModel) {
          const modelExists = AVAILABLE_MODELS.some(m => m.id === thread.lastUsedModel);
          if (modelExists) {
            setSelectedModel(thread.lastUsedModel);
          }
        }
      }
    }
  };

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
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: [...thread.messages, {
                role: 'assistant',
                content: response1.content!,
                modelId: model1Id
              }],
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
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: [...thread.messages, {
                role: 'assistant',
                content: response2.content!,
                modelId: model2Id
              }],
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

  const handleThreadColorChange = (threadId: string, color: string) => {
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

  const handleThreadIconChange = (threadId: string, icon: string) => {
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

  const handleThreadTextColorChange = (threadId: string, color: string) => {
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
      setView(activeThread?.isNote ? 'note' : 'thread');
    }
  }, [activeThreadId, activeThread?.isNote]);

  const handleKnowledgeGraphNodeClick = (threadId: string) => {
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      setActiveThreadId(threadId);
      // Set the correct view based on thread type
      setView(thread.isNote ? 'note' : 'thread');
      // Also switch to the correct tab in ThreadContainer
      const event = new CustomEvent('switch-tab', {
        detail: { tab: thread.isNote ? 'notes' : 'threads' }
      });
      window.dispatchEvent(event);
    }
  };

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
    };
    
    setThreads(prev => [...prev, newNote]);
    return newNote;
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simplify delete handler
  const handleDeleteKeyPress = useCallback((e: KeyboardEvent) => {
    console.log('Key pressed:', e.key, 'Ctrl/Cmd:', e.metaKey || e.ctrlKey); // Debug log

    if (e.key === 'Backspace' && (e.metaKey || e.ctrlKey)) {
      console.log('Delete shortcut triggered'); // Debug log
      e.preventDefault();
      e.stopPropagation();

      if (activeThreadId) {
        console.log('Active thread found:', activeThreadId); // Debug log
        setThreadToDelete(activeThreadId);
        setShowDeleteConfirm(true);
      }
    }
  }, [activeThreadId]);

  // Add keyboard shortcut effect
  useEffect(() => {
    window.addEventListener('keydown', handleDeleteKeyPress);
    return () => window.removeEventListener('keydown', handleDeleteKeyPress);
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

  return (
    <div className="flex h-screen bg-background/50 backdrop-blur-sm overflow-hidden">
      <TitleBar />
      <div className="relative flex h-screen w-full border-t border-border">
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
                setSidebarWidth(width);
                
                if (width < 250 || window.innerWidth < 500) {
                  setSidebarVisible(false);
                }
              }}
            >
              <div className="h-full relative" style={{ width: '100%' }}>
                <Sidebar
                  threads={threads}
                  activeThreadId={activeThreadId}
                  onThreadSelect={handleThreadSelect}
                  onNewThread={() => handleNewThread(false)}
                  onNewNote={handleNewNote}
                  onDeleteThread={handleDeleteThread}
                  onRenameThread={handleRenameThread}
                  onReorderThreads={handleReorderThreads}
                  onTogglePin={handleTogglePin}
                  onColorChange={handleThreadColorChange}
                  onIconChange={handleThreadIconChange}
                  onTextColorChange={handleThreadTextColorChange}
                  initialTab={activeTab}
                />
                <Footer 
                  files={activeThread?.files || []}
                  threads={threads}
                  onFileSelect={handleFileUpload}
                  onFileDelete={handleFileDelete}
                  onShowKnowledgeGraph={() => setView('graph')}
                  onShowSearch={() => setShowSearch(true)}
                  onShowPreferences={() => setShowPreferences(true)}
                />
              </div>
            </ResizeObserver>
          )}
        </motion.div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex flex-col h-full relative bg-background">
            {activeThread && !activeThread.isNote && view !== 'graph' && (
              <ThreadHeader
                thread={activeThread}
                onRename={(newName) => handleRenameThread(activeThread.id, newName)}
                onIconChange={(newIcon) => handleThreadIconChange(activeThread.id, newIcon)}
              />
            )}
            <main 
              ref={chatContainerRef}
              className={cn(
                "flex-1 overflow-y-auto min-w-0",
                activeThread?.isNote ? "mt-0" : "mt-11",
                "transition-spacing duration-200", 
                !activeThread?.isNote && view === 'thread' && "flex flex-col h-full"
              )}
              onClick={(e) => e.stopPropagation()}
            >
              {view === 'graph' ? (
                <KnowledgeGraph 
                  threads={threads} 
                  onNodeClick={handleKnowledgeGraphNodeClick}
                />
              ) : activeThread ? (
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
                    onShowPreferences={() => setShowPreferences(true)}
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
                setView(thread.isNote ? 'note' : 'thread');
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
  );
}

export default App;
