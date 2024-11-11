export interface Message {
  role: 'user' | 'assistant' | 'error' | 'comparison' | 'system';
  content: string;
  modelId?: string;
  file?: FileAttachment;
  plugins?: PluginModification[];
  comparison?: {
    message: string;
    model1: { id: string; response: string };
    model2: { id: string; response: string };
  };
  citations?: { url: string; title?: string }[];
  images?: string[];
  relatedQuestions?: string[];
}

export interface FileAttachment {
  name: string;
  content: string;
  timestamp: number;
  cacheId?: string;
}

export interface BaseThread {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  files: FileAttachment[];
  cachedFiles: string[];
  isPinned?: boolean;
  color?: string;
  textColor?: string;
  icon?: string;
  linkedNotes: string[];
}

export interface ChatThread extends BaseThread {
  isNote: false;
  messages: Message[];
  lastUsedModel?: string;
}

export interface NoteThread extends BaseThread {
  isNote: true;
  content: string;
}

export type Thread = ChatThread | NoteThread;

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
  openai?: string;
  xai?: string;
  google?: string;
  elevenlabs?: string;
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

export const THREAD_COLORS = {
  white: '#ffffff',
  black: '#000000',
  rose: '#fecdd3',
  pink: '#fbcfe8',
  purple: '#e9d5ff',
  blue: '#bfdbfe',
  cyan: '#a5f3fc',
  green: '#bbf7d0',
  yellow: '#fef08a',
  orange: '#fed7aa',
} as const;

export type ThreadColor = keyof typeof THREAD_COLORS;

export const THREAD_ICONS = [
  '💬', '🤖', '🧠', '💡', '📝', '🎯', '🔍', '⚡️',
  '🎨', '🎮', '📊', '📈', '🔧', '⚙️', '🛠️', '📱',
  '💻', '🖥️', '🌐', '🔐', '📡', '🎓', '📚', '✨',
  '🚀', '🎪', '🌟', '💫', '🔮', '🎲', '🎯', '🎪'
] as const;

export interface KnowledgeGraphProps {
  threads: Thread[];
  onNodeClick?: (nodeId: string) => void;
}

export interface GraphNode {
  id: string;
  label: string;
  data: {
    color?: string;
    size?: number;
  };
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}