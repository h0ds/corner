import React from 'react';
import { Label } from "@/components/ui/label";
import { ThemeToggle } from '../ThemeToggle';

export const Appearance: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <Label className="text-sm mb-2 block">Theme</Label>
        <ThemeToggle />
      </div>
    </div>
  );
}; 