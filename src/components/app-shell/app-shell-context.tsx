"use client";
import * as React from "react";

type AppShellContextValue = {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const AppShellContext = React.createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const ctx = React.useContext(AppShellContext);
  if (!ctx) {
    // Soft fallback so individual components don't crash if mounted outside the shell.
    return { mobileOpen: false, setMobileOpen: () => {} };
  }
  return ctx;
}

export function AppShellProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const value = React.useMemo(
    () => ({ mobileOpen, setMobileOpen }),
    [mobileOpen]
  );
  return (
    <AppShellContext.Provider value={value}>{children}</AppShellContext.Provider>
  );
}
