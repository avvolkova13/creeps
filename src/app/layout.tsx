import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { projectConfig } from "@/config/project";
import { SiteFooter, SiteHeader } from "@/components/site-shell";

export const metadata: Metadata = {
  title: { default: `${projectConfig.siteName} — скины и цифровые товары`, template: `%s — ${projectConfig.siteName}` },
  description: "Creeps — скины и цифровые товары. Калькулятор Creeps и пополнение Steam.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body><div className="paper-atmosphere" aria-hidden="true" /><SiteHeader />{children}<SiteFooter /></body>
    </html>
  );
}
