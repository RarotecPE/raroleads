import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Shell } from "@/components/shell";
import { APP } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: APP.name,
  description: APP.description,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-screen bg-app-background font-sans text-app-foreground antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
