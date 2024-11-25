import { invoke } from '@tauri-apps/api/core';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getCompletion(prompt: string): Promise<ApiResponse<string>> {
  try {
    const response = await invoke<string>('get_completion', { prompt });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getChatCompletion(messages: any[]): Promise<ApiResponse<string>> {
  try {
    const response = await invoke<string>('get_chat_completion', { messages });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getEmbeddings(text: string): Promise<ApiResponse<number[]>> {
  try {
    const response = await invoke<number[]>('get_embeddings', { text });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function getModels(): Promise<ApiResponse<string[]>> {
  try {
    const response = await invoke<string[]>('get_models');
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function verifyApiKey(provider: string, key: string): Promise<ApiResponse<boolean>> {
  try {
    const response = await invoke<boolean>('verify_api_key', { provider, key });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function textToSpeech(text: string): Promise<ApiResponse<string>> {
  try {
    const response = await invoke<string>('text_to_speech', { text });
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
