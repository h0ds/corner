import { FileText, FileIcon, Download } from 'lucide-react';
import { Button } from './ui/button';

interface FilePreviewProps {
  fileName: string;
  content: string;
}

export const FilePreview: React.FC<FilePreviewProps> = ({ fileName, content }) => {
  const getFileIcon = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'txt':
      case 'md':
        return <FileText className="h-4 w-4" />;
      default:
        return <FileIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-accent/50 rounded-sm">
      <div className="flex items-center gap-2 text-sm">
        {getFileIcon()}
        <span className="font-medium">{fileName}</span>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-6 w-6 ml-auto"
          onClick={() => {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <div className="text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto bg-background p-2 rounded-sm">
        {content}
      </div>
    </div>
  );
}; 