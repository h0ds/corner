import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { Preferences } from "./components/Preferences";
import { ModelSelector, AVAILABLE_MODELS } from "./components/ModelSelector";
import { TypingIndicator } from "./components/TypingIndicator";
import { ThemeToggle } from "./components/ThemeToggle";
import { AnimatePresence } from "framer-motion";
import { Settings } from "lucide-react";
import { useToast } from "./hooks/use-toast";

interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Meta (Command/Windows) or Control + K
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

  const handleSendMessage = async (message: string) => {
    setLoading(true);
    
    const userMessage: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMessage]);

    try {
      const model = AVAILABLE_MODELS.find(m => m.id === selectedModel);
      if (!model) throw new Error('Invalid model selected');

      // Send parameters as a single request object
      const response = await invoke<ApiResponse>('send_message', { 
        request: {
          message,
          model: selectedModel,
          provider: model.provider
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
    <div className="flex flex-col h-screen bg-background">
      <main 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8 text-sm">
              Start a conversation (⌘/Ctrl + K to clear history)
            </div>
          ) : (
            messages.map((message, index) => (
              <ChatMessage
                key={index}
                role={message.role}
                content={message.content}
                onErrorClick={() => setShowPreferences(true)}
              />
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
