import { create, writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { nanoid } from 'nanoid';

export interface CachedFile {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  size: number;
  type: string;
  isBase64?: boolean;
}

const CACHE_DIR = 'cache';

export async function initializeCache(): Promise<void> {
  try {
    // Create cache directory using Rust backend
    await invoke('init_cache_dir');
    console.log('Cache directory initialized');
  } catch (error) {
    console.error('Failed to initialize cache directory:', error);
    throw error;
  }
}

export async function cacheFile(file: File, content: string): Promise<CachedFile> {
  const fileId = nanoid();
  
  // Detect if content is base64 encoded
  const isBase64 = content.startsWith('data:');
  
  const cachedFile: CachedFile = {
    id: fileId,
    name: file.name,
    content,
    timestamp: Date.now(),
    size: file.size,
    type: file.type,
    isBase64
  };

  try {
    console.log('Starting file cache process:', {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      isBase64,
      contentLength: content.length
    });

    // Use Rust backend to cache the file
    await invoke('cache_file', {
      fileId,
      fileName: file.name,
      content,
      metadata: JSON.stringify(cachedFile)
    });

    console.log('File cached successfully:', {
      id: fileId,
      name: file.name
    });
    
    return cachedFile;
  } catch (error) {
    console.error('Failed to cache file:', error);
    throw error;
  }
}

export async function loadCachedFile(fileId: string): Promise<CachedFile> {
  try {
    // Load using Rust backend
    const result = await invoke<{ metadata: string, content: string }>('load_cached_file', { fileId });
    const metadata = JSON.parse(result.metadata);
    return {
      ...metadata,
      content: result.content
    };
  } catch (error) {
    console.error('Failed to load cached file:', error);
    throw error;
  }
} 