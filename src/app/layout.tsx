import type { Metadata, Viewport } from "next";
import "@fontsource/eb-garamond/500-italic.css";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Convo",
  description: "Learn Mandarin through conversation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e9e9ee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <div className="app-column">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
