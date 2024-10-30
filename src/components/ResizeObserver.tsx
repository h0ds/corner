import React, { useEffect, useRef } from 'react';

interface ResizeObserverProps {
  onResize: (entry: ResizeObserverEntry) => void;
  children: React.ReactNode;
}

export const ResizeObserver: React.FC<ResizeObserverProps> = ({ onResize, children }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new window.ResizeObserver((entries) => {
      if (entries[0]) {
        onResize(entries[0]);
      }
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [onResize]);

  return (
    <div ref={ref} className="h-full">
      {children}
    </div>
  );
}; 