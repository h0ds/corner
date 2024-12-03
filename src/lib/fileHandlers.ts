export async function getFileHandler(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      
      // For binary files (images, PDFs, EPUBs), ensure we have a proper data URL
      if ((isImageFile(file) || isPdfFile(file) || isEpubFile(file)) && !result.startsWith('data:')) {
        resolve(`data:${getMimeType(file)};base64,${result.split(',')[1] || result}`);
      } else {
        resolve(result);
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read file'));
    };
    
    // Handle binary files as data URLs
    if (isImageFile(file) || isPdfFile(file) || isEpubFile(file)) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
}

function getMimeType(file: File): string {
  // Use the file's type if available
  if (file.type) {
    return file.type;
  }
  
  // Fallback to extension-based detection
  const name = file.name.toLowerCase();
  if (isPdfFile(file)) {
    return 'application/pdf';
  }
  if (isEpubFile(file)) {
    return 'application/epub+zip';
  }
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) {
    return 'image/jpeg';
  }
  if (name.endsWith('.png')) {
    return 'image/png';
  }
  if (name.endsWith('.gif')) {
    return 'image/gif';
  }
  if (name.endsWith('.webp')) {
    return 'image/webp';
  }
  if (name.endsWith('.svg')) {
    return 'image/svg+xml';
  }
  if (name.endsWith('.bmp')) {
    return 'image/bmp';
  }
  
  // Default to octet-stream for unknown binary files
  return 'application/octet-stream';
}

export function isImageFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true;
  const name = file.name.toLowerCase();
  return /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/.test(name);
}

export function isPdfFile(file: File): boolean {
  if (file.type === 'application/pdf') return true;
  return file.name.toLowerCase().endsWith('.pdf');
}

export function isEpubFile(file: File): boolean {
  if (file.type === 'application/epub+zip') return true;
  return file.name.toLowerCase().endsWith('.epub');
}