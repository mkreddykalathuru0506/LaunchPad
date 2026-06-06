"use client";
import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Light/dark toggle. Renders a stable placeholder until mounted so the icon
 * never mismatches the server-rendered theme (next-themes hydration rule).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {/* Both icons stay in the DOM; CSS picks one — no hydration flicker. */}
      <Sun className={isDark ? "hidden h-4 w-4" : "h-4 w-4"} aria-hidden />
      <Moon className={isDark ? "h-4 w-4" : "hidden h-4 w-4"} aria-hidden />
    </Button>
  );
}
