import { invoke } from '@tauri-apps/api/core';
import { rateLimitManager } from './rateLimitManager';

export interface SendMessageRequest {
  message: string;
  model: string;
  provider: string;
  file_content?: string;
  file_name?: string;
}

export interface ApiResponse {
  success: boolean;
  data?: string;
  error?: string;
  citations?: Array<{
    url: string;
    title?: string;
  }>;
  images?: string[];
  related_questions?: string[];
}

export async function getCompletion(prompt: string): Promise<ApiResponse> {
  try {
    const response = await invoke<string>('get_completion', { prompt });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getChatCompletion(messages: any[]): Promise<ApiResponse> {
  try {
    const response = await invoke<string>('get_chat_completion', { messages });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getEmbeddings(text: string): Promise<ApiResponse> {
  try {
    const response = await invoke<number[]>('get_embeddings', { text });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getModels(): Promise<ApiResponse> {
  try {
    const response = await invoke<string[]>('get_models');
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
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
