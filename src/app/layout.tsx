import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { UserPreferencesProvider } from "@/components/providers/UserPreferencesProvider";

export const metadata: Metadata = {
  title: "vezCore | Ekosystem zarządzania",
  description: "Panel administracyjny ekosystemu VEZ",
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pl" className="dark">
      <body className="min-h-full flex flex-col antialiased">
        <ThemeProvider>
          <UserPreferencesProvider>
            <ConfirmProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </ConfirmProvider>
          </UserPreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
