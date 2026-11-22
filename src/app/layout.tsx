import type { Metadata, Viewport } from "next";
import "@fontsource/eb-garamond/500-italic.css";
import "./globals.css";
import { Toaster } from "sonner";
import AppGate from "@/components/auth/AppGate";
import VoicePreferenceSync from "@/components/VoicePreferenceSync";
import { PaywallProvider } from "@/components/subscription/PaywallProvider";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Convo",
  description: "Learn Mandarin through conversation",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#e9e9ee",
  // The on-screen keyboard shrinks the layout viewport (so 100dvh shrinks with it) instead of
  // overlaying the page, which keeps the chat input bar above the keyboard.
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="antialiased">
      <body>
        <div className="app-column">
          <AuthProvider>
            <VoicePreferenceSync />
            <PaywallProvider>
              <AppGate>{children}</AppGate>
            </PaywallProvider>
          </AuthProvider>
          <Toaster position="top-center" richColors />
        </div>
      </body>
    </html>
  );
}
