import React, { useCallback } from 'react';
import { Upload, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from './ui/button';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
  onClear: () => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  selectedFile,
  onClear,
  disabled
}) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled,
    accept: {
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json'],
      'text/markdown': ['.md'],
    }
  });

  if (selectedFile) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-accent rounded-md text-sm">
        <span className="truncate max-w-[200px]">{selectedFile.name}</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-4 w-4 p-0"
          onClick={onClear}
          disabled={disabled}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={`
        cursor-pointer p-2 rounded-md transition-colors
        ${isDragActive ? 'bg-accent' : 'hover:bg-accent'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input {...getInputProps()} />
      <Upload className="h-4 w-4" />
    </div>
  );
}; 