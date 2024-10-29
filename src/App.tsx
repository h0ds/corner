import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { Preferences } from "./components/Preferences";
import { ModelSelector, AVAILABLE_MODELS } from "./components/ModelSelector";
import { TypingIndicator } from "./components/TypingIndicator";
import { FilePreview } from "./components/FilePreview";
import { AnimatePresence, motion } from "framer-motion";
import { Settings, Upload, PanelLeftClose, PanelLeft } from "lucide-react";
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

interface ApiResponse {
  content?: string;
  error?: string;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

function App() {
  const [threads, setThreads] = useState<Thread[]>(() => loadThreads());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(() => loadActiveThreadId());
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferenceTab, setPreferenceTab] = useState<'api-keys' | 'appearance' | 'models'>('api-keys');
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
    console.log('onDrop called', acceptedFiles);
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
        const handler = getFileHandler(file);
        const content = await handler(file);

        console.log('File content read successfully, type:', file.type);
        handleSendMessage("", file, content);
      } catch (error) {
        console.error('File read error:', error);
        toast({
          variant: "destructive",
          description: "Failed to read file content",
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
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (messages.length > 0) {
          if (activeThreadId) {
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
          }
          toast({
            description: "Chat history cleared",
            duration: 2000,
          });
        }
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        setSidebarVisible(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages, toast, activeThreadId, sidebarVisible]);

  const handleSendMessage = async (message: string, file?: File, fileContent?: string) => {
    setLoading(true);
    
    let cachedFile: CachedFile | undefined;

    if (file && fileContent) {
      try {
        // Cache the file
        cachedFile = await cacheFile(file, fileContent);
        console.log('File cached:', cachedFile);
      } catch (error) {
        console.error('Failed to cache file:', error);
        toast({
          variant: "destructive",
          description: "Failed to cache file",
          duration: 2000,
        });
        setLoading(false);
        return;
      }
    }

    const userMessage: Message = { 
      role: 'user', 
      content: message || 'Uploaded file:',
      ...(cachedFile && {
        file: {
          name: cachedFile.name,
          content: cachedFile.content,
          timestamp: cachedFile.timestamp,
          cacheId: cachedFile.id
        }
      })
    };

    // Update thread with user message and cached file reference
    if (activeThreadId) {
      setThreads(prev => prev.map(thread => {
        if (thread.id === activeThreadId) {
          return {
            ...thread,
            messages: [...thread.messages, userMessage],
            files: cachedFile ? [
              ...thread.files,
              {
                name: cachedFile.name,
                content: cachedFile.content,
                timestamp: cachedFile.timestamp,
                cacheId: cachedFile.id
              }
            ] : thread.files,
            cachedFiles: cachedFile ? 
              [...(thread.cachedFiles || []), cachedFile.id] : 
              thread.cachedFiles || [],
            updatedAt: Date.now(),
          };
        }
        return thread;
      }));
    }

    try {
      const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      if (!model) throw new Error('Invalid model selected');

      console.log('Invoking backend with:', {
        message: message || `Analyze this ${file?.name}:`,
        model: selectedModel,
        provider: model.provider,
        hasFileContent: !!fileContent,
        fileName: file?.name
      });

      const response = await invoke<ApiResponse>('send_message', { 
        request: {
          message: message || `Analyze this ${file?.name}:`,
          model: selectedModel,
          provider: model.provider,
          file_content: fileContent,
          file_name: file?.name
        }
      });
      
      console.log('Backend response:', response);

      if (response.error) {
        const errorMessage: Message = {
          role: 'error',
          content: response.error,
        };
        // Update thread with error message
        if (activeThreadId) {
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId) {
              return {
                ...thread,
                messages: [...thread.messages, errorMessage],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
        }
      } else if (response.content) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content,
          modelId: selectedModel,
        };
        // Update thread with assistant message
        if (activeThreadId) {
          setThreads(prev => prev.map(thread => {
            if (thread.id === activeThreadId) {
              return {
                ...thread,
                messages: [...thread.messages, assistantMessage],
                updatedAt: Date.now(),
              };
            }
            return thread;
          }));
        }
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'error',
        content: `Application error: ${error}`,
      };
      // Update thread with error message
      if (activeThreadId) {
        setThreads(prev => prev.map(thread => {
          if (thread.id === activeThreadId) {
            return {
              ...thread,
              messages: [...thread.messages, errorMessage],
              updatedAt: Date.now(),
            };
          }
          return thread;
        }));
      }
    } finally {
      setLoading(false);
    }
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

      {/* Toggle button with keyboard shortcut tooltip */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setSidebarVisible(!sidebarVisible)}
              className="absolute left-2 top-2 z-50 p-2 bg-background hover:bg-accent 
                        rounded-sm transition-colors border border-border shadow-sm"
            >
              {sidebarVisible ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeft className="h-4 w-4" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs">
            Toggle Sidebar
            <span className="ml-2 text-muted-foreground">⌘S</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
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
                            {model.provider === 'anthropic' ? 'Anthropic' : 'Perplexity'}
                          </span>
                        </div>
                      ) : selectedModel;
                    })()}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <button
                onClick={() => {
                  setPreferenceTab('api-keys');
                  setShowPreferences(true);
                }}
                className="p-2 bg-background text-muted-foreground hover:text-foreground 
                         hover:bg-accent rounded-sm shadow-sm transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
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
