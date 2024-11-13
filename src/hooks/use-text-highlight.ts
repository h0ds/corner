import { useState, useEffect } from 'react';

interface UseTextHighlightProps {
  onHighlight?: (text: string, rect?: DOMRect) => void;
}

export function useTextHighlight({ onHighlight }: UseTextHighlightProps = {}) {
  const [selectedText, setSelectedText] = useState('');

  useEffect(() => {
    const handleSelectionChange = () => {
      const selection = window.getSelection();
      const text = selection?.toString() || '';
      
      if (text && text !== selectedText) {
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          onHighlight?.(text, rect);
        } else {
          onHighlight?.(text);
        }
        setSelectedText(text);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, [onHighlight, selectedText]);

  return { selectedText };
} 