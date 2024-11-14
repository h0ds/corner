import React, { useState } from 'react';
import { Label } from "@/components/ui/label";
import { ThemeToggle } from '../ThemeToggle';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, Save, RotateCcw } from 'lucide-react';
import { useTheme } from "next-themes";
import { sanitizeCssVar } from '@/lib/utils';

interface CustomTheme {
  id: string;
  name: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
  };
}

export const defaultColors = {
  background: '#ffffff',
  foreground: '#020817',
  primary: '#020817',
  secondary: '#f1f5f9',
  accent: '#f1f5f9',
  muted: '#f1f5f9',
  border: '#e2e8f0',
};

export const Appearance: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>(() => {
    try {
      const stored = localStorage.getItem('custom-themes');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load custom themes:', error);
      return [];
    }
  });
  const [editingTheme, setEditingTheme] = useState<CustomTheme | null>(null);

  const resetAppearance = () => {
    // Clear custom themes from storage
    localStorage.removeItem('custom-themes');
    setCustomThemes([]);
    
    // Reset to default theme
    setTheme('light');
    
    // Clear all custom CSS variables
    const root = document.documentElement;
    Object.keys(defaultColors).forEach(key => {
      root.style.removeProperty(`--${sanitizeCssVar(key)}`);
    });
  };

  const saveCustomTheme = () => {
    if (!editingTheme?.name) return;

    const sanitizedName = sanitizeCssVar(editingTheme.name);
    const themeWithSanitizedName = {
      ...editingTheme,
      sanitizedName
    };

    const updatedThemes = editingTheme.id 
      ? customThemes.map(t => t.id === editingTheme.id ? themeWithSanitizedName : t)
      : [...customThemes, { ...themeWithSanitizedName, id: crypto.randomUUID() }];

    setCustomThemes(updatedThemes);
    localStorage.setItem('custom-themes', JSON.stringify(updatedThemes));
    setEditingTheme(null);

    // Apply the theme if it's currently selected
    if (theme === sanitizedName) {
      const root = document.documentElement;
      Object.entries(editingTheme.colors).forEach(([key, value]) => {
        const rgb = hexToRgb(value);
        if (rgb) {
          const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
          root.style.setProperty(
            `--${sanitizeCssVar(key)}`, 
            `${hsl.h} ${hsl.s}% ${hsl.l}%`
          );
        }
      });
    }

    // After saving theme changes to localStorage
    window.dispatchEvent(new Event('customThemeChange'))
  };

  const startNewTheme = () => {
    setEditingTheme({
      id: '',
      name: 'New Theme',
      colors: { ...defaultColors }
    });
  };

  const deleteTheme = (themeId: string) => {
    const themeToDelete = customThemes.find(t => t.id === themeId);
    const updatedThemes = customThemes.filter(t => t.id !== themeId);
    setCustomThemes(updatedThemes);
    localStorage.setItem('custom-themes', JSON.stringify(updatedThemes));
    
    // If the deleted theme was active, switch to light theme
    if (themeToDelete && sanitizeCssVar(themeToDelete.name) === theme) {
      setTheme('light');
      
      // Reset CSS variables
      const root = document.documentElement;
      Object.keys(defaultColors).forEach(key => {
        root.style.removeProperty(`--${sanitizeCssVar(key)}`);
      });
    }

    // Notify theme toggle of the change
    window.dispatchEvent(new Event('customThemeChange'));
  };

  // Helper functions for color conversion
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }

      h /= 6;
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-sm mb-2 block">Theme</Label>
          <ThemeToggle />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={resetAppearance}
          className="text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset All
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm">Custom Themes</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={startNewTheme}
            className="text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            New Theme
          </Button>
        </div>

        {editingTheme && (
          <Card className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">Theme Name</Label>
              <Input
                value={editingTheme.name}
                onChange={e => setEditingTheme({
                  ...editingTheme,
                  name: e.target.value
                })}
                className="h-8 text-sm"
                placeholder="Enter theme name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {Object.entries(editingTheme.colors).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs capitalize">{key}</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={value}
                      onChange={e => setEditingTheme({
                        ...editingTheme,
                        colors: {
                          ...editingTheme.colors,
                          [key]: e.target.value
                        }
                      })}
                      className="h-8 w-8 p-0 border-0"
                    />
                    <Input
                      value={value}
                      onChange={e => setEditingTheme({
                        ...editingTheme,
                        colors: {
                          ...editingTheme.colors,
                          [key]: e.target.value
                        }
                      })}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingTheme(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={saveCustomTheme}
                className="text-xs"
                disabled={!editingTheme.name}
              >
                <Save className="h-3 w-3 mr-1" />
                Save Theme
              </Button>
            </div>
          </Card>
        )}

        <div className="space-y-2">
          {customThemes.map(theme => (
            <Card
              key={theme.id}
              className="p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  {Object.values(theme.colors).map((color, i) => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-xl"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span className="text-sm">{theme.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTheme(theme)}
                  className="text-xs h-7 px-2"
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteTheme(theme.id)}
                  className="text-xs h-7 px-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}; 