import { create, readTextFile } from '@tauri-apps/plugin-fs';

export async function getFileHandler(file: File): Promise<string> {
  if (file.type.startsWith('image/')) {
    return handleImageFile(file);
  }
  if (file.type === 'application/pdf') {
    return handlePdfFile(file);
  }
  return handleTextFile(file);
}

async function handleTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

async function handleImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function handlePdfFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      // Convert ArrayBuffer to base64
      if (typeof base64String === 'string') {
        resolve(base64String);
      } else {
        const bytes = new Uint8Array(base64String);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        resolve('data:application/pdf;base64,' + btoa(binary));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf';
}