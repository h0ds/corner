"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
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
