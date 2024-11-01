export interface Message {
  role: 'user' | 'assistant' | 'error' | 'comparison';
  content: string;
  modelId?: string;
  file?: FileAttachment;
  plugins?: PluginModification[];
  comparison?: {
    message: string;
    model1: { id: string; response: string };
    model2: { id: string; response: string };
  };
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
  lastUsedModel?: string;
  isPinned?: boolean;
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

export interface PluginModification {
  type: 'replace' | 'append' | 'prepend';
  content: string;
  meta?: Record<string, any>;
  pluginId: string;
  componentName?: string;
}

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  code: string;
  components?: Record<string, React.ComponentType<any>>;
  hooks: {
    onMessage?: (message: Message) => Promise<Message | void>;
    onThreadCreate?: (thread: Thread) => Promise<Thread | void>;
    onThreadDelete?: (threadId: string) => Promise<void>;
    onFileUpload?: (file: File) => Promise<File | void>;
  };
} 