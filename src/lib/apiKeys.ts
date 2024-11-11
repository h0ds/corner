import { invoke } from '@tauri-apps/api/core';
import { ApiKeys } from '@/types';

export async function loadApiKeys(): Promise<ApiKeys> {
  try {
    const keys = await invoke<ApiKeys>('get_stored_api_keys');
    console.log('Loaded API keys:', {
      anthropic: keys.anthropic ? '***' : 'none',
      perplexity: keys.perplexity ? '***' : 'none',
      openai: keys.openai ? '***' : 'none',
      xai: keys.xai ? '***' : 'none',
      google: keys.google ? '***' : 'none',
      elevenlabs: keys.elevenlabs ? '***' : 'none'
    });
    return keys;
  } catch (error) {
    console.error('Failed to load API keys:', error);
    return {};
  }
}

export async function saveApiKey(provider: 'anthropic' | 'perplexity' | 'openai' | 'xai' | 'google' | 'elevenlabs', key: string): Promise<void> {
  try {
    await invoke('store_api_key', { 
      request: {
        provider,
        key
      }
    });
    console.log(`Saved ${provider} API key`);
  } catch (error) {
    console.error(`Failed to save ${provider} API key:`, error);
    throw error;
  }
} 