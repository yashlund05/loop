// Copyright (c) 2026 Emmanuel George P and Sameer Makani. All rights reserved.
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LOOP | Hyperlocal AI Reuse Marketplace",
  description: "Hyperlocal reuse marketplace for Electronics, Furniture, Books, and Hobbies.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <span className="text-xl font-bold tracking-tight text-slate-900">LOOP</span>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 rounded-full px-2.5 py-0.5">
              Campus Reuse
            </span>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-6">{children}</main>
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <p>LOOP - Human-in-the-loop, privacy-preserving reuse marketplace.</p>
        </footer>
      </body>
    </html>
  );
}
