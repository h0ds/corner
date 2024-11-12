import { useState, useEffect } from 'react';

interface UseTextHighlightProps {
  onHighlight?: (text: string) => void;
}

export function useTextHighlight({ onHighlight }: UseTextHighlightProps = {}) {
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      
      if (text && text !== selectedText) {
        setSelectedText(text);
        onHighlight?.(text);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [onHighlight, selectedText]);

  return { selectedText };
} 