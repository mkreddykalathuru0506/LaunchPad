import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Launch Pad — Background Verification",
  description: "Multi-stage onboarding and background verification platform for ElivixIT.",
  applicationName: "Launch Pad",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-full bg-background font-sans">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
