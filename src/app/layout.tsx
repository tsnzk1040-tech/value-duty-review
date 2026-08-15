import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthGate } from "@/components/auth/auth-gate";
import { AppChrome } from "@/components/layout/app-chrome";
import { SettingsProvider } from "@/components/settings/settings-provider";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "value-duty-review",
  description: "通勤向け・自分専用のレビュー／ローテ Web",
  applicationName: "value-duty-review",
  appleWebApp: {
    capable: true,
    title: "VDRレビュー",
    statusBarStyle: "default",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ja"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SettingsProvider>
          <Suspense
            fallback={
              <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-8 text-sm text-muted-foreground">
                読み込み中…
              </div>
            }
          >
            <AuthGate>
              <AppChrome>{children}</AppChrome>
            </AuthGate>
          </Suspense>
        </SettingsProvider>
      </body>
    </html>
  );
}
