import { Thread, Message } from '@/types';

export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  enabled: boolean;
  code: string;
  // Add hooks for different events
  hooks: {
    onMessage?: (message: Message) => Promise<Message | void>;
    onThreadCreate?: (thread: Thread) => Promise<Thread | void>;
    onThreadDelete?: (threadId: string) => Promise<void>;
    onFileUpload?: (file: File) => Promise<File | void>;
  };
}

const PLUGINS_STORAGE_KEY = 'lex-plugins';

export async function loadPlugins(): Promise<Plugin[]> {
  try {
    const stored = localStorage.getItem(PLUGINS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch (error) {
    console.error('Failed to load plugins:', error);
    return [];
  }
}

export async function savePlugin(plugin: Plugin): Promise<void> {
  try {
    const plugins = await loadPlugins();
    const index = plugins.findIndex(p => p.id === plugin.id);
    
    if (index >= 0) {
      plugins[index] = plugin;
    } else {
      plugins.push(plugin);
    }
    
    localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(plugins));
  } catch (error) {
    console.error('Failed to save plugin:', error);
  }
}

export async function deletePlugin(pluginId: string): Promise<void> {
  try {
    const plugins = await loadPlugins();
    const filtered = plugins.filter(p => p.id !== pluginId);
    localStorage.setItem(PLUGINS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to delete plugin:', error);
  }
}

export async function togglePlugin(pluginId: string, enabled: boolean): Promise<void> {
  try {
    const plugins = await loadPlugins();
    const plugin = plugins.find(p => p.id === pluginId);
    if (plugin) {
      plugin.enabled = enabled;
      await savePlugin(plugin);
    }
  } catch (error) {
    console.error('Failed to toggle plugin:', error);
  }
}

// Function to safely evaluate plugin code
export function evaluatePlugin(plugin: Plugin): Plugin {
  try {
    // Create a safe context for the plugin
    const context = {
      plugin: { ...plugin },
      console: { log: console.log, error: console.error },
    };

    // Evaluate the code in a safe context
    const fn = new Function('context', `
      with (context) {
        ${plugin.code}
        return plugin;
      }
    `);

    return fn(context);
  } catch (error) {
    console.error(`Failed to evaluate plugin ${plugin.id}:`, error);
    return plugin;
  }
} 