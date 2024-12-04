import { invoke } from '@tauri-apps/api/core';
import { rateLimitManager } from './rateLimitManager';

export interface Message {
  role: string;
  content: string;
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function verifyApiKey(provider: string, key: string): Promise<ApiResponse> {
  try {
    const response = await invoke<boolean>('verify_api_key', { provider, key });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function textToSpeech(text: string): Promise<ApiResponse> {
  const rateLimitStatus = rateLimitManager.checkRateLimit('tts');
  if (rateLimitStatus.isLimited) {
    return {
      success: false,
      error: rateLimitManager.getRateLimitMessage('tts')
    };
  }

  try {
    const response = await invoke<string>('text_to_speech', { text });
    return { success: true, data: response };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.toLowerCase().includes('rate limit')) {
      rateLimitManager.setRateLimit('tts');
      return {
        success: false,
        error: rateLimitManager.getRateLimitMessage('tts')
      };
    }
    return { success: false, error: errorMessage };
  }
}

export async function generateCompletion(provider: string, messages: Message[]): Promise<string> {
  try {
    return await invoke<string>('generate_completion', {
      provider,
      messages
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') throw error;
      
      // Map common error cases
      if (error.message.includes('API key not configured')) {
        throw new Error(`${provider} API key is not configured. Please check your settings.`);
      }
      if (error.message.includes('quota exceeded') || error.message.includes('rate limit')) {
        throw new Error('API rate limit exceeded. Please try again later.');
      }
      if (error.message.includes('model not found')) {
        throw new Error(`Selected ${provider} model is not available. Please try again.`);
      }
    }
    throw error;
  }
}
