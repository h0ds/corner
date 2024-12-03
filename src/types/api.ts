export type SendMessageRequest = {
  message: string;
  model: string;
  provider: string;
  file_content?: string;
  file_name?: string;
}

export type ApiResponse = {
  content?: string;
  error?: string;
  citations?: Array<{
    url: string;
    title?: string;
  }>;
  images?: string[];
  related_questions?: string[];
}

export type ChatMessage = {
  role: string;
  content: string;
}

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  max_tokens?: number;
  temperature?: number;
}

export type ChatResponse = {
  id: string;
  content: Array<{
    text: string;
    type: string;
  }>;
  model: string;
  role: string;
} 