import React, { useState } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    onSendMessage(input);
    setInput('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-end">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1 min-h-[44px] max-h-[200px] p-3 rounded-lg border border-gray-200 
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:bg-gray-50 disabled:cursor-not-allowed resize-none"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <button
        type="submit"
        disabled={disabled || !input.trim()}
        className="flex items-center gap-2 px-4 py-3 rounded-lg bg-blue-600 text-white
                   hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                   disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        <span>Send</span>
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path 
            fill="currentColor" 
            d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"
          />
        </svg>
      </button>
    </form>
  );
};
