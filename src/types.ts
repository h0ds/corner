export interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  modelId?: string;
  file?: FileAttachment;
}

export interface FileAttachment {
  name: string;
  content: string;
  timestamp: number;
  cacheId?: string;
}

export interface Thread {
  id: string;
  name: string;
  messages: Message[];
  files: FileAttachment[];
  createdAt: number;
  updatedAt: number;
  cachedFiles: string[];
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