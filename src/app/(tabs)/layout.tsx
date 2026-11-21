import type { ReactNode } from "react";
import TabBar from "@/components/TabBar";

/** Tab screens fill the space above the tab bar; each page manages its own scroll area. */
export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      <div className="relative min-h-0 flex-1">{children}</div>
      <TabBar />
    </div>
  );
}
