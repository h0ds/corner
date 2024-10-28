import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";

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
      const response = await invoke<ApiResponse>('send_message', { message });
      
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
    <div className="flex flex-col h-screen bg-gray-50">

      <main 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-6 space-y-6"
      >
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            Start a conversation
          </div>
        ) : (
          messages.map((message, index) => (
            <ChatMessage
              key={index}
              role={message.role}
              content={message.content}
            />
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-gray-200">
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={loading}
        />
      </footer>
    </div>
  );
}

export default App;
