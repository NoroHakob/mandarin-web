import type { Metadata } from "next";
import VoiceSettings from "@/components/settings/VoiceSettings";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "App Settings · Convo",
};

// Signed-in only: /settings is not in AppGate's PUBLIC_PATHS, so signed-out visitors see the intro screen.
export default function SettingsPage() {
  return (
    <LegalPage title="App Settings" lastUpdated={null}>
      <VoiceSettings />
    </LegalPage>
  );
}
