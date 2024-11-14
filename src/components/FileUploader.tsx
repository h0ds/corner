import React from 'react';
import { Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDropzone } from 'react-dropzone';

interface FileUploaderProps {
  isOpen: boolean;
  onClose: () => void;
  onFileSelect: (file: File) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  isOpen,
  onClose,
  onFileSelect,
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0]);
        onClose();
      }
    },
    maxFiles: 1,
    accept: {
      'text/*': ['.txt', '.md'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/javascript': ['.js', '.jsx', '.ts', '.tsx'],
      'text/html': ['.html', '.htm'],
      'text/css': ['.css'],
      'text/yaml': ['.yml', '.yaml'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp'],
      'application/pdf': ['.pdf']
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-6">
        <DialogHeader className="pb-4">
          <DialogTitle className="font-geist text-lg tracking-tight flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload File
          </DialogTitle>
        </DialogHeader>

        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-xl p-10 text-center cursor-pointer
            transition-all duration-200 hover:border-primary/50 hover:bg-primary/5
            ${isDragActive 
              ? 'border-primary bg-primary/10 scale-[0.99] shadow-inner' 
              : 'border-border hover:shadow-sm'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className={`
            p-4 rounded-full bg-primary/5 w-fit mx-auto mb-6
            transition-transform duration-200
            ${isDragActive ? 'scale-95' : 'scale-100'}
          `}>
            <Upload className={`
              h-8 w-8 text-primary transition-colors
              ${isDragActive ? 'text-primary' : 'text-primary/80'}
            `} />
          </div>
          <p className="text-sm font-medium text-foreground mb-2">
            {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
          </p>
          <p className="text-sm text-muted-foreground">
            or click to browse your files
          </p>
          <p className="text-xs text-muted-foreground/80 mt-4">
            Supports text, images, PDFs and more (max 10MB)
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}; 