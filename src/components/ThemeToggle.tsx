import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { sanitizeCssVar } from '@/lib/utils';
import { defaultColors } from './preferences/Appearance';

interface CustomTheme {
  id: string;
  name: string;
  colors: Record<string, string>;
}

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()
  const [customThemes, setCustomThemes] = useState<CustomTheme[]>([])

  // Function to load themes from localStorage
  const loadThemes = () => {
    const stored = localStorage.getItem('custom-themes')
    if (stored) {
      try {
        const parsedThemes = JSON.parse(stored)
        setCustomThemes(parsedThemes)
        
        // If current theme was deleted, switch to light theme
        if (theme && !['light', 'dark', 'black', 'system'].includes(theme)) {
          const themeExists = parsedThemes.some(
            (t: CustomTheme) => sanitizeCssVar(t.name) === theme
          )
          if (!themeExists) {
            handleThemeChange('light')
          }
        }
      } catch (error) {
        console.error('Failed to parse custom themes:', error)
      }
    } else {
      setCustomThemes([])
    }
  }

  // Load themes initially
  useEffect(() => {
    loadThemes()
  }, [theme])

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'custom-themes') {
        loadThemes()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    // Also listen for custom storage event for same-window updates
    window.addEventListener('customThemeChange', loadThemes)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('customThemeChange', loadThemes)
    }
  }, [])

  // Add getIcon function
  const getIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />
      case 'light':
        return <Sun className="h-4 w-4" />
      case 'black':
        return <Monitor className="h-4 w-4" />
      default:
        const customTheme = customThemes.find(t => sanitizeCssVar(t.name) === theme)
        if (customTheme) {
          return <div className="flex gap-1 h-4">
            {Object.values(customTheme.colors).slice(0, 2).map((color, i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        }
        return <Sun className="h-4 w-4" />
    }
  }

  const handleThemeChange = (newTheme: string) => {
    // Clear any existing custom theme variables
    const root = document.documentElement;
    Object.keys(defaultColors).forEach(key => {
      root.style.removeProperty(`--${sanitizeCssVar(key)}`);
    });

    // Find and apply custom theme if selected
    const customTheme = customThemes.find(t => sanitizeCssVar(t.name) === sanitizeCssVar(newTheme));
    if (customTheme) {
      Object.entries(customTheme.colors).forEach(([key, value]) => {
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

    // Set the theme
    setTheme(sanitizeCssVar(newTheme));
  };

  // Helper functions for color conversion
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null
  }

  const rgbToHsl = (r: number, g: number, b: number) => {
    r /= 255
    g /= 255
    b /= 255

    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s, l = (max + min) / 2

    if (max === min) {
      h = s = 0
    } else {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }

      h /= 6
    }

    return {
      h: Math.round(h * 360),
      s: Math.round(s * 100),
      l: Math.round(l * 100)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="rounded-sm w-[200px] justify-start">
          {getIcon()}
          <span className="ml-2">
            {customThemes.find(t => sanitizeCssVar(t.name) === theme)?.name || 
             (theme === 'black' ? 'Monochrome' : 
              theme === 'dark' ? 'Dark' : 
              'Light')}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-sm">
        <DropdownMenuItem onClick={() => handleThemeChange("light")} className="text-sm">
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("dark")} className="text-sm">
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleThemeChange("black")} className="text-sm">
          <Monitor className="h-4 w-4 mr-2" />
          Monochrome
        </DropdownMenuItem>

        {customThemes.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {customThemes.map(customTheme => (
              <DropdownMenuItem 
                key={customTheme.id}
                onClick={() => handleThemeChange(customTheme.name)}
                className="text-sm"
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {Object.values(customTheme.colors).map((color, i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {customTheme.name}
                </div>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
