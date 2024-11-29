export async function getFileHandler(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      
      // For images and PDFs, ensure we have a proper data URL
      if ((isImageFile(file) || isPdfFile(file)) && !result.startsWith('data:')) {
        resolve(`data:${file.type};base64,${result.split(',')[1] || result}`);
      } else {
        resolve(result);
      }
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error('Failed to read file'));
    };
    
    if (isImageFile(file) || isPdfFile(file)) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  });
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