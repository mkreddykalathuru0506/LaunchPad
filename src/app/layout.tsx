import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { ThemeProvider } from "@/components/app/theme-provider";

// "Clearance dossier" type system: Jakarta for body, Bricolage Grotesque for
// display headlines (chiseled, characterful), JetBrains Mono for case data —
// references, timestamps, MRZ strips, stamps.
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s — Launch Pad",
    default: "Launch Pad — Background Verification",
  },
  description: "Multi-stage onboarding and background verification platform for ElvixIT.",
  applicationName: "Launch Pad",
  robots: "noindex, nofollow",
  // The browser-tab / home-screen icons are supplied via the App-Router file
  // convention: src/app/icon.png (mark-only favicon) and src/app/apple-icon.png
  // (180px apple-touch). Next auto-emits the <link rel="icon"> tags, so no
  // manual `icons` block — and no dangling /favicon.ico reference — is needed.
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jakarta.variable} ${bricolage.variable} ${jetbrains.variable}`}>
      <body className="min-h-full bg-background font-sans">
        <ThemeProvider>
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
