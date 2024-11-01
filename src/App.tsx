import { useState, useRef, useEffect, useMemo, KeyboardEvent as ReactKeyboardEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { Preferences } from "./components/Preferences";
import { AVAILABLE_MODELS } from "./components/ModelSelector";
import { TypingIndicator } from "./components/TypingIndicator";
import { FilePreview } from "./components/FilePreview";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { getFileHandler } from '@/lib/fileHandlers';
import { 
  saveThread, 
  loadThreads, 
  deleteThread, 
  saveActiveThreadId, 
  loadActiveThreadId, 
  clearThreads,
  saveSelectedModel,
  loadSelectedModel
} from '@/lib/storage';
import { ModelIcon } from './components/ModelIcon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThreadList } from './components/ThreadList';
import { nanoid } from 'nanoid';
import { Message, Thread } from '@/types';
import { initializeCache, cacheFile, CachedFile } from '@/lib/fileCache';
import { KeyboardShortcut, loadShortcuts, matchesShortcut } from '@/lib/shortcuts';
import { Features } from './components/Features';
import { ResizeObserver } from './components/ResizeObserver';
import { Plugin, loadPlugins } from '@/lib/plugins';

interface ApiResponse {
  content?: string;
  error?: string;
}

// Add type definition at the top
type PreferenceTab = 'api-keys' | 'appearance' | 'models' | 'shortcuts';

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

  // Initialize cache on mount
  useEffect(() => {
    initializeCache().catch(console.error);
  }, []);

  // Get active thread messages
  const messages = useMemo(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    return activeThread?.messages || [];
  }, [threads, activeThreadId]);

  // Update thread storage when threads change
  useEffect(() => {
    const activeThread = threads.find(t => t.id === activeThreadId);
    if (activeThread) {
      saveThread(activeThread);
    }
  }, [threads, activeThreadId]);

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

  const handleNewThread = () => {
    const newThread: Thread = {
      id: nanoid(),
      name: 'New Thread',
      messages: [],
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cachedFiles: [],
      lastUsedModel: selectedModel
    };
    setThreads(prev => [...prev, newThread]);
    setActiveThreadId(newThread.id);
  };

  const handleDeleteThread = (threadId: string) => {
    setThreads(prev => prev.filter(t => t.id !== threadId));
    deleteThread(threadId);
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

  useEffect(() => {
    const handleKeyDown = async (e: ReactKeyboardEvent<Element>) => {
      // Load current shortcuts
      const currentShortcuts = await loadShortcuts();
      
      // Find clear history shortcut
      const clearHistoryShortcut = currentShortcuts.find(s => s.id === 'clear-history');
      const toggleSidebarShortcut = currentShortcuts.find(s => s.id === 'toggle-sidebar');

      if (clearHistoryShortcut && matchesShortcut(e, clearHistoryShortcut)) {
        e.preventDefault();
        clearThreads();
        setThreads([]);
        setActiveThreadId(null);
      }

      if (toggleSidebarShortcut && matchesShortcut(e, toggleSidebarShortcut)) {
        e.preventDefault();
        setSidebarVisible(!sidebarVisible);
      }
    };

    window.addEventListener('keydown', handleKeyDown as any);
    return () => window.removeEventListener('keydown', handleKeyDown as any);
  }, [sidebarVisible]);

  const handleSendMessage = async (message: string, overrideModel?: string) => {
    setLoading(true);
    
    if (message && activeThreadId) {
      // Use the overrideModel if provided, otherwise use selectedModel
      const modelToUse = overrideModel || selectedModel;
      
      // Store the clean message in the thread
      const userMessage: Message = { 
        role: 'user', 
        content: message
      };

      // Update thread with user message
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
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

        // Send the clean message to the API
        const response = await invoke<ApiResponse>('send_message', {
          request: {
            message,
            model: modelToUse,
            provider: model.provider,
            file_content: undefined,
            file_name: undefined
          }
        });
        
        if (response.error) {
          // Add error message to thread
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId) {
              return {
                ...thread,
                messages: [...thread.messages, { role: 'error', content: response.error! }],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
        } else if (response.content) {
          // Add assistant message to thread
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId) {
              return {
                ...thread,
                messages: [...thread.messages, { 
                  role: 'assistant', 
                  content: response.content!,
                  modelId: modelToUse
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
        // Fix: getFileHandler returns a Promise<string> directly
        content = await getFileHandler(file);
      }

      if (activeThreadId) {
        handleSendMessage("", file, content);
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

  const handleThreadSelect = (threadId: string) => {
    setActiveThreadId(threadId);
    
    // Find the thread
    const thread = threads.find(t => t.id === threadId);
    if (thread) {
      // Get the last message with a modelId
      const lastModelMessage = [...thread.messages]
        .reverse()
        .find(m => m.modelId);

      if (lastModelMessage?.modelId) {
        // Make sure the model exists in AVAILABLE_MODELS before setting it
        const modelExists = AVAILABLE_MODELS.some(m => m.id === lastModelMessage.modelId);
        if (modelExists) {
          console.log('Restoring model from last message:', lastModelMessage.modelId, 'for thread:', threadId);
          setSelectedModel(lastModelMessage.modelId);
        } else {
          console.warn('Stored model not found:', lastModelMessage.modelId);
        }
      } else if (thread.lastUsedModel) {
        // Fall back to lastUsedModel if no message has a modelId
        const modelExists = AVAILABLE_MODELS.some(m => m.id === thread.lastUsedModel);
        if (modelExists) {
          console.log('Restoring last used model:', thread.lastUsedModel, 'for thread:', threadId);
          setSelectedModel(thread.lastUsedModel);
        } else {
          console.warn('Stored model not found:', thread.lastUsedModel);
        }
      }
    }
  };

  const clearCurrentThread = () => {
    if (activeThreadId) {
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            messages: [],
            files: [],
            cachedFiles: [],
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));
    }
  };

  return (
    <div className="flex h-screen bg-background">
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
              
              // Auto-hide sidebar if width is less than 250px or window width is less than 500px
              if (width < 250 || window.innerWidth < 500) {
                setSidebarVisible(false);
              }
            }}
          >
            <div className="h-full" style={{ width: '100%' }}>
              <ThreadList
                threads={threads}
                activeThreadId={activeThreadId}
                onThreadSelect={handleThreadSelect}
                onNewThread={handleNewThread}
                onDeleteThread={handleDeleteThread}
                onRenameThread={handleRenameThread}
                onReorderThreads={handleReorderThreads}
              />
            </div>
          </ResizeObserver>
        )}
      </motion.div>

      {/* Toggle button with keyboard shortcut tooltip and Shortcuts */}
      <Features 
        sidebarVisible={sidebarVisible}
        onSidebarToggle={handleSidebarToggle}
        onOpenShortcuts={() => {
          setPreferenceTab('shortcuts');
          setShowPreferences(true);
        }}
        files={activeThread?.files || []}
        onFileSelect={handleFileUpload}
        onFileDelete={handleFileDelete}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex flex-col h-full relative">
          <main 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6 min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground mt-8 text-sm">
                  Start a conversation or drop a file ({clearHistoryShortcut} to clear history)
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className="space-y-2 min-w-0">
                    <ChatMessage
                      role={message.role}
                      content={message.content}
                      onErrorClick={() => setShowPreferences(true)}
                      modelId={message.modelId}
                    />
                    {message.file && (
                      <FilePreview
                        fileName={message.file.name}
                        content={message.file.content}
                      />
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <TypingIndicator />
                </div>
              )}
            </AnimatePresence>
          </main>

          <footer 
            className="relative p-4 bg-card border-t border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute right-4 -top-12 flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      onClick={() => {
                        setPreferenceTab('models');
                        setShowPreferences(true);
                      }}
                      className="p-2 bg-background text-muted-foreground hover:text-foreground border border-border/50
                               hover:bg-accent rounded-sm transition-colors cursor-pointer"
                    >
                      <ModelIcon modelId={selectedModel} className="h-5 w-5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {(() => {
                      const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
                      return model ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-muted-foreground">
                            {model.provider === 'anthropic' ? 'Anthropic' : 
                             model.provider === 'openai' ? 'OpenAI' : 'Perplexity'}
                          </span>
                        </div>
                      ) : selectedModel;
                    })()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <ChatInput
              onSendMessage={handleSendMessage}
              onClearThread={clearCurrentThread}
              disabled={loading}
            />
          </footer>

          <Preferences
            isOpen={showPreferences}
            onClose={() => setShowPreferences(false)}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            initialTab={preferenceTab}
            plugins={plugins}
            onPluginChange={setPlugins}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
