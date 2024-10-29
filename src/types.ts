export interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  modelId?: string;
  file?: {
    name: string;
    content: string;
  };
}

export interface Thread {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export interface ApiResponse {
  content?: string;
  error?: string;
}

export interface ApiKeys {
  anthropic?: string;
  perplexity?: string;
} 