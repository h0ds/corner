export interface Message {
  role: 'user' | 'assistant' | 'error' | 'system' | 'comparison';
  content: string;
  timestamp?: number;
  modelId?: string;
  citations?: Array<{
    url: string;
    title?: string;
  }>;
  plugins?: any[];
  images?: string[];
  relatedQuestions?: string[];
  isAudioResponse?: boolean;
  comparison?: {
    message: string;
    model1: { id: string; response: string };
    model2: { id: string; response: string };
  };
  file?: {
    name: string;
    content: string;
  };
}

export interface FileAttachment {
  id: string;
  name: string;
  content: string;
  type: string;
  timestamp: number;
  cacheId?: string;
}

export interface BaseThread {
  id: string;
  name: string;
  files: FileAttachment[];
  createdAt: number;
  updatedAt: number;
  cachedFiles: string[];
  linkedNotes: string[];
  isPinned?: boolean;
  color?: string;
  icon?: string;
  textColor?: string;
  isNote: boolean;
}

export interface ChatThread extends BaseThread {
  isNote: false;
  messages: Message[];
  lastUsedModel: string;
}

export interface NoteThread extends BaseThread {
  isNote: true;
  content: string;
  parentId: string | null;
  children: string[];
}

export interface Thread {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isNote?: boolean;
  isPinned?: boolean;
  color?: string;
  icon?: string;
  textColor?: string;
  showLinkedItems?: boolean;
  isFolder?: boolean;
  parentId?: string;
  children?: string[];
}

export type ThreadType = ChatThread | NoteThread | Thread;

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
    onThreadCreate?: (thread: ThreadType) => Promise<ThreadType | void>;
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
  threads: ThreadType[];
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