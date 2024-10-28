import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Message {
  id: number;
  content: string;
  isUser: boolean;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      content: inputMessage,
      isUser: true,
    };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // TODO: Add AI response using invoke
    // For now, let's add a mock response
    const aiMessage: Message = {
      id: Date.now() + 1,
      content: "This is a mock AI response.",
      isUser: false,
    };
    setMessages(prev => [...prev, aiMessage]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Chat messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.isUser
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="border-t bg-white p-4">
        <div className="flex gap-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 focus:outline-none disabled:opacity-50"
            disabled={!inputMessage.trim()}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

export default App;
