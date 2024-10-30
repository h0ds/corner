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
  clearThreads 
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

interface ApiResponse {
  content?: string;
  error?: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

// Add type definition at the top
type PreferenceTab = 'api-keys' | 'appearance' | 'models' | 'shortcuts';

function App() {
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => loadActiveThreadId());
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferenceTab, setPreferenceTab] = useState<PreferenceTab>('api-keys');
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);

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

  const handleNewThread = () => {
    const newThread: Thread = {
      id: nanoid(),
      name: 'New Thread',
      messages: [],
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      cachedFiles: []
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
          
          // Get the full system path
          let fullPath = nativeFile.path;
          
          // For macOS, handle the path differently
          if (process.platform === 'darwin') {
            // Remove the file:// prefix if it exists
            fullPath = fullPath.replace(/^file:\/\//, '');
            
            // Decode any URL encoded characters
            fullPath = decodeURIComponent(fullPath);
            
            // If the path doesn't start with /, add it
            if (!fullPath.startsWith('/')) {
              fullPath = `/${fullPath}`;
            }
            
            // If the path contains the file name without directory, try to get the directory
            if (!fullPath.includes('/')) {
              try {
                const realPath = await invoke('get_real_path', { 
                  path: fullPath,
                  fileName: file.name 
                });
                if (realPath) {
                  fullPath = realPath as string;
                }
              } catch (e) {
                console.error('Failed to resolve real path:', e);
              }
            }
          }
          
          console.log('Attempting to read file from path:', fullPath);
          content = await invoke('handle_file_drop', { path: fullPath });
        } else {
          console.log('Web file - no native path available');
          content = await getFileHandler(file);
        }

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
      const items = event.dataTransfer?.items;
      if (!items) return [];

      const files: File[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            // Try different methods to get the full path
            let fullPath: string | undefined;
            
            // Method 1: Check for native path property
            if ('path' in file) {
              fullPath = (file as any).path;
            }
            
            // Method 2: Try webkitGetAsEntry
            if (!fullPath) {
              const entry = item.webkitGetAsEntry?.();
              if (entry?.isFile && entry.fullPath) {
                fullPath = entry.fullPath;
              }
            }
            
            // Method 3: Try dataTransfer.files
            if (!fullPath && event.dataTransfer?.files?.[i]) {
              const dtFile = event.dataTransfer.files[i];
              if ('path' in dtFile) {
                fullPath = (dtFile as any).path;
              }
            }

            if (fullPath) {
              console.log('Found file path:', fullPath);
              Object.defineProperty(file, 'path', {
                value: fullPath,
                writable: false
              });
            } else {
              console.log('No path found for file:', file.name);
            }
            
            files.push(file);
          }
        }
      }
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
  });

  const dropzoneProps = getRootProps({
    onClick: (e) => e.stopPropagation(),
  });

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      try {
        const shortcuts = await loadShortcuts();
        
        const clearHistoryShortcut = shortcuts.find(s => s.id === 'clear-history');
        const toggleSidebarShortcut = shortcuts.find(s => s.id === 'toggle-sidebar');

        // Create a wrapper object that matches the expected type
        const eventWrapper = {
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          altKey: e.altKey,
          shiftKey: e.shiftKey,
          preventDefault: () => e.preventDefault()
        } as unknown as React.KeyboardEvent<Element>;

        if (clearHistoryShortcut && matchesShortcut(eventWrapper, clearHistoryShortcut)) {
          e.preventDefault();
          if (messages.length > 0 && activeThreadId) {
            setThreads(prev => prev.map(thread => {
              if (thread.id === activeThreadId) {
                return {
                  ...thread,
                  messages: [],
                  updatedAt: Date.now(),
                };
              }
              return thread;
            }));
            toast({
              description: "Chat history cleared",
              duration: 2000,
            });
          }
        }
        
        if (toggleSidebarShortcut && matchesShortcut(eventWrapper, toggleSidebarShortcut)) {
          e.preventDefault();
          setSidebarVisible(prev => !prev);
        }
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages, toast, activeThreadId]);

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

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar with animation */}
      <motion.div
        initial={false}
        animate={{
          width: sidebarVisible ? '250px' : '0px',
          opacity: sidebarVisible ? 1 : 0,
        }}
        transition={{ duration: 0.2 }}
        className="relative"
      >
        {sidebarVisible && (
          <ThreadList
            threads={threads}
            activeThreadId={activeThreadId}
            onThreadSelect={setActiveThreadId}
            onNewThread={handleNewThread}
            onDeleteThread={handleDeleteThread}
            onRenameThread={handleRenameThread}
            onReorderThreads={handleReorderThreads}
          />
        )}
      </motion.div>

      {/* Toggle button with keyboard shortcut tooltip and Shortcuts */}
      <Features 
        sidebarVisible={sidebarVisible}
        onSidebarToggle={() => setSidebarVisible(!sidebarVisible)}
        onOpenShortcuts={() => {
          setPreferenceTab('shortcuts');
          setShowPreferences(true);
        }}
        files={activeThread?.files || []}
        onFileSelect={handleFileUpload}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div 
          {...getRootProps()}
          className={cn(
            "flex flex-col h-screen bg-background relative transition-all duration-200",
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
                    "p-8 rounded-lg border-4 border-dashed shadow-xl",
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

          {uploadedFile && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="mx-4 mb-4 p-4 border-2 border-dashed rounded-lg bg-secondary shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-primary/10 rounded-md">
                    <svg
                      className="w-8 h-8 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium">{uploadedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.size / 1024).toFixed(2)} KB • {uploadedFile.type}
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                  }}
                  className="p-2 hover:bg-destructive/10 rounded-full transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-destructive"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
          )}

          <main 
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <AnimatePresence>
              {messages.length === 0 ? (
                <div className="text-center text-muted-foreground mt-8 text-sm">
                  Start a conversation or drop a file (⌘/Ctrl + K to clear history)
                </div>
              ) : (
                messages.map((message, index) => (
                  <div key={index} className="space-y-2">
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
          />
        </div>
      </div>
    </div>
  );
}

export default App;
