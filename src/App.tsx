import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { Preferences } from "./components/Preferences";
import { ModelSelector, AVAILABLE_MODELS } from "./components/ModelSelector";
import { TypingIndicator } from "./components/TypingIndicator";
import { ThemeToggle } from "./components/ThemeToggle";
import { AnimatePresence } from "framer-motion";

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

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

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
        <div className="flex justify-between items-center">
          <ThemeToggle />
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
            disabled={loading}
          />
        </div>

        <AnimatePresence>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground mt-8 text-sm">
              Start a conversation with Claude
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

      <footer className="relative p-4 bg-card border-t">
        <div className="absolute right-4 -top-12">
          <button
            onClick={() => setShowPreferences(true)}
            className="p-2 bg-background text-muted-foreground hover:text-foreground hover:bg-accent 
                     rounded-sm shadow-md transition-colors"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
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
      />
    </div>
  );
}

export default App;
