import { FileInfo } from '@/types';

export async function handleTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read text file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function handleImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (typeof result === 'string') {
        resolve(`![${file.name}](${result})`); // Markdown image format
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function handlePDFFile(file: File): Promise<string> {
  // For now, just return file info. PDF parsing could be added later
  return `PDF File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
}

export async function handleDocumentFile(file: File): Promise<string> {
  // For Office documents, return file info
  const extension = file.name.split('.').pop()?.toLowerCase();
  const docType = {
    'doc': 'Word Document',
    'docx': 'Word Document',
    'xls': 'Excel Spreadsheet',
    'xlsx': 'Excel Spreadsheet',
    'ppt': 'PowerPoint Presentation',
    'pptx': 'PowerPoint Presentation',
  }[extension || ''] || 'Document';

  return `${docType}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
}

export async function handleCodeFile(file: File): Promise<string> {
  const content = await handleTextFile(file);
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Add code fence markers based on file extension
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'rb': 'ruby',
    'php': 'php',
    'go': 'go',
    'rs': 'rust',
    'sh': 'bash',
    'bat': 'batch',
    'ps1': 'powershell',
  };

  const language = languageMap[extension || ''] || 'plaintext';
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

export function getFileHandler(file: File): (file: File) => Promise<string> {
  const type = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();

  // Image files
  if (type.startsWith('image/')) {
    return handleImageFile;
  }

  // PDF files
  if (type === 'application/pdf') {
    return handlePDFFile;
  }

  // Office documents
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension || '')) {
    return handleDocumentFile;
  }

  // Code files
  if ([
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'rb', 'php',
    'go', 'rs', 'sh', 'bat', 'ps1'
  ].includes(extension || '')) {
    return handleCodeFile;
  }

  // Default to text handler
  return handleTextFile;
}

export function getFileIcon(file: File): string {
  const type = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();

  // Return SVG string instead of JSX
  return `<svg
      class="w-8 h-8 text-primary"
      fill="none" 
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>`;
}