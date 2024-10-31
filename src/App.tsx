import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { resolveResource } from '@tauri-apps/api/path';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { Preferences } from "./components/Preferences";
import { ModelSelector, AVAILABLE_MODELS } from "./components/ModelSelector";
import { TypingIndicator } from "./components/TypingIndicator";
import { FilePreview } from "./components/FilePreview";
import { AnimatePresence, motion } from "framer-motion";
import { Settings, Upload, PanelLeftClose, PanelLeft, Keyboard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from 'react-dropzone';
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
import { Message, Thread, FileAttachment } from '@/types';
import { cn } from "@/lib/utils";
import { initializeCache, cacheFile, CachedFile } from '@/lib/fileCache';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { KeyboardShortcut, loadShortcuts, matchesShortcut } from '@/lib/shortcuts';
import { Features } from './components/Features';
import { ResizeObserver } from './components/ResizeObserver';
import { Plugin, loadPlugins, evaluatePlugin } from '@/lib/plugins';

interface ApiResponse {
  content?: string;
  error?: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
  content?: string;
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
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('onDrop called with files:', acceptedFiles);
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      console.log('Processing file:', file);
      
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          description: "File size must be less than 10MB",
          duration: 2000,
        });
        return;
      }

      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
      });
      
      try {
        let content: string;
        const nativeFile = file as any;
        
        if (nativeFile.path) {
          console.log('Original native file path:', nativeFile.path);
          
          // For macOS, try to get the real path again if needed
          let fullPath = nativeFile.path;
          if (process.platform === 'darwin' && !fullPath.includes('/')) {
            try {
              fullPath = await invoke('get_real_path', {
                path: file.name,
                fileName: file.name
              }) as string;
              console.log('Got real path from backend:', fullPath);
            } catch (error) {
              console.error('Failed to get real path:', error);
            }
          }
          
          console.log('Attempting to read file from path:', fullPath);
          content = await invoke('handle_file_drop', { path: fullPath });
        } else {
          console.log('Web file - no native path available');
          content = await getFileHandler(file);
        }

        setUploadedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          content
        });

        console.log('File content read successfully');
        handleSendMessage("", file, content);
      } catch (error) {
        console.error('File read error:', error);
        toast({
          variant: "destructive",
          description: `Failed to read file: ${error}`,
          duration: 2000,
        });
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    noClick: true,
    disabled: loading || !activeThreadId,
    accept: {
      'text/*': ['.txt', '.md'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/javascript': ['.js', '.jsx', '.ts', '.tsx'],
      'text/html': ['.html', '.htm'],
      'text/css': ['.css'],
      'text/yaml': ['.yml', '.yaml'],
      'image/*': [
        '.png', 
        '.jpg', 
        '.jpeg', 
        '.gif', 
        '.webp', 
        '.svg', 
        '.bmp'
      ],
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/x-python': ['.py'],
      'text/x-java': ['.java'],
      'text/x-c': ['.c', '.cpp', '.h'],
      'text/x-ruby': ['.rb'],
      'text/x-php': ['.php'],
      'text/x-go': ['.go'],
      'text/x-rust': ['.rs'],
      'application/xml': ['.xml'],
      'application/x-yaml': ['.yaml', '.yml'],
      'application/x-toml': ['.toml'],
      'application/x-sh': ['.sh'],
      'application/x-bat': ['.bat'],
      'application/x-powershell': ['.ps1']
    },
    getFilesFromEvent: async (event: any) => {
      console.log('getFilesFromEvent called with:', event);
      
      // Handle both drop and input change events
      const items = event.dataTransfer?.items || event.target?.files;
      if (!items) {
        console.log('No items found in event');
        return [];
      }

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        let file: File | null = null;
        
        if (items[i] instanceof File) {
          // Handle direct file objects
          file = items[i];
        } else if (items[i].kind === 'file') {
          // Handle DataTransferItem
          file = items[i].getAsFile();
        }

        if (file) {
          console.log('Processing file:', file.name);
          
          // For macOS, try to get the real path
          if (process.platform === 'darwin') {
            try {
              const nativePath = await invoke('get_real_path', {
                path: file.name,
                fileName: file.name
              });
              console.log('Got native path:', nativePath);
              
              if (nativePath) {
                Object.defineProperty(file, 'path', {
                  value: nativePath,
                  writable: false
                });
              }
            } catch (error) {
              console.error('Failed to get native path:', error);
            }
          }
          
          files.push(file);
        }
      }

      console.log('Returning files:', files);
      return files;
    },
    onDropRejected: (fileRejections) => {
      console.log('Files rejected:', fileRejections);
      toast({
        variant: "destructive",
        description: !activeThreadId 
          ? "Please create or select a thread first"
          : fileRejections[0]?.errors[0]?.message || "File type not supported",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error('Dropzone error:', error);
      toast({
        variant: "destructive",
        description: "Failed to process file",
        duration: 2000,
      });
    }
  });

  const dropzoneProps = getRootProps({
    onClick: (e) => e.stopPropagation(),
    onDragEnter: (e) => {
      console.log('Drag enter:', e);
    },
    onDragOver: (e) => {
      console.log('Drag over:', e);
    },
    onDragLeave: (e) => {
      console.log('Drag leave:', e);
    },
    onDrop: (e) => {
      console.log('Drop:', e);
    }
  });

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarVisible]);

  const handleSendMessage = async (message: string, file?: File, fileContent?: string) => {
    setLoading(true);
    
    let cachedFile: CachedFile | undefined;

    if (file && fileContent) {
      try {
        console.log('Attempting to cache file:', {
          name: file.name,
          type: file.type,
          size: file.size,
          contentLength: fileContent.length,
          isBase64: fileContent.startsWith('data:')
        });
        
        // Cache the file
        cachedFile = await cacheFile(file, fileContent);
        console.log('File cached successfully:', cachedFile);

        // If this is just a file upload (no message), update thread and return
        if (!message && activeThreadId) {
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId) {
              return {
                ...thread,
                files: [
                  ...(thread.files || []),
                  {
                    name: cachedFile!.name,
                    content: cachedFile!.content,
                    timestamp: cachedFile!.timestamp,
                    cacheId: cachedFile!.id
                  }
                ],
                cachedFiles: [...(thread.cachedFiles || []), cachedFile!.id],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
          setLoading(false);
          setUploadedFile(null);
          return;
        }
      } catch (error) {
        console.error('Failed to cache file:', error);
        toast({
          variant: "destructive",
          description: "Failed to cache file",
          duration: 2000,
        });
        setLoading(false);
        setUploadedFile(null);
        return;
      }
    }

    // Handle message sending
    if (message && activeThreadId) {
      const userMessage: Message = { 
        role: 'user', 
        content: message,
        ...(cachedFile && {
          file: {
            name: cachedFile.name,
            content: cachedFile.content,
            timestamp: cachedFile.timestamp,
            cacheId: cachedFile.id
          }
        })
      };

      // Update thread with user message and last used model
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            messages: [...thread.messages, userMessage],
            lastUsedModel: selectedModel,
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));

      try {
        const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
        if (!model) throw new Error('Invalid model selected');

        console.log('Sending message:', {
          message,
          model: selectedModel,
          provider: model.provider,
          hasFileContent: !!fileContent,
          fileName: file?.name
        });

        const response = await invoke<ApiResponse>('send_message', {
          request: {
            message,
            model: selectedModel,
            provider: model.provider,
            file_content: fileContent,
            file_name: file?.name
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
                  modelId: selectedModel
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
    setUploadedFile(null);
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
        <div 
          {...dropzoneProps}
          className={cn(
            "flex flex-col h-full relative",
            isDragActive && activeThreadId && "ring-4 ring-primary ring-inset bg-primary/5",
            isDragActive && !activeThreadId && "ring-4 ring-destructive ring-inset bg-destructive/5"
          )}
        >
          <input {...getInputProps()} />

          <AnimatePresence>
            {isDragActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center"
              >
                <motion.div
                  initial={{ y: 20 }}
                  animate={{ y: 0 }}
                  exit={{ y: 20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className={cn(
                    "p-8 rounded-md border-4 border-dashed shadow-xl",
                    activeThreadId 
                      ? "border-primary bg-primary/5" 
                      : "border-destructive bg-destructive/5"
                  )}
                >
                  <div className="flex flex-col items-center gap-4">
                    <Upload className={cn(
                      "h-12 w-12 animate-bounce",
                      activeThreadId ? "text-primary" : "text-destructive"
                    )} />
                    <div className="space-y-1 text-center">
                      <p className="text-xl font-medium">
                        {activeThreadId 
                          ? "Drop your file here" 
                          : "Please select a thread first"}
                      </p>
                      {activeThreadId && (
                        <p className="text-sm text-muted-foreground">
                          Supports images, PDFs, and text files up to 10MB
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* {(uploadedFile?.content || activeThread?.files.length > 0) && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mx-4 mb-4 space-y-4"
            >
              {uploadedFile?.content && (
                <FilePreview
                  fileName={uploadedFile.name}
                  content={uploadedFile.content}
                  onClear={() => setUploadedFile(null)}
                  defaultExpanded={true}
                />
              )}
              {activeThread?.files.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground px-1">
                    Added files:
                  </div>
                  {activeThread.files.map((file, index) => (
                    <FilePreview
                      key={index}
                      fileName={file.name}
                      content={file.content}
                      defaultExpanded={false}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )} */}

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
                      className="p-2 bg-background text-muted-foreground hover:text-foreground 
                               hover:bg-accent rounded-sm shadow-sm transition-colors cursor-pointer"
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
