"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { sanitizeCssVar } from '@/lib/utils'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const sanitizedThemes = props.themes?.map(theme => sanitizeCssVar(theme)) || []
  
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={sanitizedThemes}
      storageKey="ui-theme"
      value={{
        light: "light",
        dark: "dark",
        system: "system",
      }}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}
