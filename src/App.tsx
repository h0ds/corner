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

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      try {
        const content = await file.text();
        handleSendMessage("", file, content);
      } catch (error) {
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
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/markdown': ['.md'],
    }
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

      const response = await invoke<ApiResponse>('send_message', { 
        request: {
          message: message || `Analyze this ${file?.name}:`,
          model: selectedModel,
          provider: model.provider,
          file_content: fileContent,
          file_name: file?.name
        }
      });
      
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
      className="flex flex-col h-screen bg-background relative"
    >
      <AnimatePresence>
        {isDragActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm border-2 border-dashed border-primary/50 rounded-sm pointer-events-none"
          >
            <div className="flex h-full items-center justify-center gap-3 text-muted-foreground">
              <Upload className="h-6 w-6" />
              <span className="text-lg">Drop your file to start a conversation</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <input {...getInputProps()} />
      
      <main 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
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

      <footer className="relative p-4 bg-card border-t border-border">
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
