"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Class-based theming (tailwind darkMode: ["class"]). Defaults to the OS
 * preference and persists the user's explicit choice in localStorage.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  );
}
