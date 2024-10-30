import { invoke } from '@tauri-apps/api/core';
import { create, writeTextFile, readTextFile, BaseDirectory } from '@tauri-apps/plugin-fs';
import { nanoid } from 'nanoid';

export interface CachedFile {
  id: string;
  name: string;
  content: string;
  timestamp: number;
  size: number;
  type: string;
}

const CACHE_DIR = 'cache';

export async function initializeCache(): Promise<void> {
  try {
    await create(CACHE_DIR, { 
      dir: BaseDirectory.AppData 
    });
  } catch (error) {
    console.error('Failed to initialize cache directory:', error);
  }
}

export async function cacheFile(file: File, content: string): Promise<CachedFile> {
  const fileId = nanoid();
  const cachedFile: CachedFile = {
    id: fileId,
    name: file.name,
    content,
    timestamp: Date.now(),
    size: file.size,
    type: file.type,
  };

  try {
    // Save file metadata
    const metaPath = `${CACHE_DIR}/${fileId}.meta.json`;
    await writeTextFile(metaPath, JSON.stringify(cachedFile), { 
      dir: BaseDirectory.AppData 
    });

    // Save file content
    const contentPath = `${CACHE_DIR}/${fileId}.content`;
    await writeTextFile(contentPath, content, { 
      dir: BaseDirectory.AppData 
    });

    return cachedFile;
  } catch (error) {
    console.error('Failed to cache file:', error);
    throw error;
  }
}

export async function loadCachedFile(fileId: string): Promise<CachedFile> {
  try {
    // Load metadata
    const metaPath = `${CACHE_DIR}/${fileId}.meta.json`;
    const metaContent = await readTextFile(metaPath, { 
      dir: BaseDirectory.AppData 
    });
    const metadata = JSON.parse(metaContent);

    // Load content
    const contentPath = `${CACHE_DIR}/${fileId}.content`;
    const content = await readTextFile(contentPath, { 
      dir: BaseDirectory.AppData 
    });

    return {
      ...metadata,
      content
    };
  } catch (error) {
    console.error('Failed to load cached file:', error);
    throw error;
  }
} 