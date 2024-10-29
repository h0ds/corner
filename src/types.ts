export interface Message {
  role: 'user' | 'assistant' | 'error';
  content: string;
  file?: {
    name: string;
    content: string;
  };
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