import { useState, useRef, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { Preferences } from "./components/Preferences";
import { ModelSelector, AVAILABLE_MODELS } from "./components/ModelSelector";
import { TypingIndicator } from "./components/TypingIndicator";
import { FilePreview } from "./components/FilePreview";
import { AnimatePresence, motion } from "framer-motion";
import { Settings, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDropzone } from 'react-dropzone';

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  file?: {
    name: string;
    content: string;
  };
}

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
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [uploadedFile, setUploadedFile] = useState<FileInfo | null>(null);

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
        const content = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const result = e.target?.result;
            if (typeof result === 'string') {
              resolve(result);
            } else {
              reject(new Error('Failed to read file as text'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        });

        console.log('File content read successfully, length:', content.length);
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
    disabled: loading,
    accept: {
      'text/*': ['.txt', '.md'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/javascript': ['.js', '.jsx', '.ts', '.tsx'],
      'text/html': ['.html', '.htm'],
      'text/css': ['.css'],
      'text/yaml': ['.yml', '.yaml'],
    },
    onDropRejected: (fileRejections) => {
      console.log('Files rejected:', fileRejections);
      toast({
        variant: "destructive",
        description: fileRejections[0]?.errors[0]?.message || "File type not supported",
        duration: 2000,
      });
    },
    onError: (error) => {
      console.error('Dropzone error:', error);
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
          setMessages([]);
          toast({
            description: "Chat history cleared",
            duration: 2000,
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messages, toast]);

  const handleSendMessage = async (message: string, file?: File, fileContent?: string) => {
    setLoading(true);
    
    if (file && fileContent) {
      console.log('Sending file to backend:', {
        fileName: file.name,
        fileSize: file.size,
        contentPreview: fileContent.slice(0, 100) + '...',
      });
    }

    const userMessage: Message = { 
      role: 'user', 
      content: message || 'Uploaded file:',
      ...(file && fileContent && {
        file: {
          name: file.name,
          content: fileContent
        }
      })
    };
    setMessages(prev => [...prev, userMessage]);

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
        setMessages(prev => [...prev, errorMessage]);
      } else if (response.content) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.content,
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'error',
        content: `Application error: ${error}`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      {...getRootProps()}
      className={`flex flex-col h-screen bg-background relative ${
        isDragActive ? 'ring-2 ring-primary ring-inset' : ''
      }`}
    >
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-0 left-0 bg-black/50 text-white p-2 z-[9999] text-xs">
          isDragActive: {isDragActive.toString()}<br />
          uploadedFile: {uploadedFile ? uploadedFile.name : 'no'}<br />
          loading: {loading.toString()}
        </div>
      )}
      
      <input {...getInputProps()} />

      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[9999] bg-background/95 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="p-8 rounded-lg border-2 border-dashed border-primary">
              <div className="flex items-center gap-3 text-primary">
                <Upload className="h-6 w-6" />
                <p className="text-lg font-medium">Drop your file here</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
        <div className="absolute right-4 -top-12">
          <button
            onClick={() => setShowPreferences(true)}
            className="p-2 bg-background text-muted-foreground hover:text-foreground 
                     hover:bg-accent rounded-sm shadow-sm transition-colors"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
        {uploadedFile && (
          <div className="mx-4 mb-4 p-4 border-2 border-dashed rounded-lg bg-secondary">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
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
                <div>
                  <p className="font-medium">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUploadedFile(null);
                }}
                className="p-1 hover:bg-destructive/10 rounded"
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
              </button>
            </div>
          </div>
        )}
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
      />
    </div>
  );
}

export default App;
