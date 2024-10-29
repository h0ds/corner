import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "next-themes"
import { useEffect } from "react"

export function ThemeToggle() {
  const { setTheme, theme, systemTheme } = useTheme()

  useEffect(() => {
    if (theme === 'system' || !theme) {
      setTheme(systemTheme || 'light')
    }
  }, [systemTheme, theme, setTheme])

  const getIcon = () => {
    switch (theme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'black':
        return <Monitor className="h-4 w-4" />;
      default:
        return <Sun className="h-4 w-4" />;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="default" className="rounded-sm w-[200px] justify-start">
          {getIcon()}
          <span className="ml-2">
            {theme === 'black' ? 'Monochrome' : 
             theme === 'dark' ? 'Dark' : 
             'Light'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-sm">
        <DropdownMenuItem onClick={() => setTheme("light")} className="text-sm">
          <Sun className="h-4 w-4 mr-2" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")} className="text-sm">
          <Moon className="h-4 w-4 mr-2" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("black")} className="text-sm">
          <Monitor className="h-4 w-4 mr-2" />
          Monochrome
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
