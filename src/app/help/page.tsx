import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import SupportActions from "@/components/help/SupportActions";
import LegalPage from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Help & Support · Convo",
};

function Faq({ question, children }: { question: string; children: ReactNode }) {
  return (
    <details className="group border-b border-border py-1 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg py-3 font-semibold focus-visible:outline-2 focus-visible:outline-accent [&::-webkit-details-marker]:hidden">
        {question}
        <span
          aria-hidden
          className="shrink-0 text-xl leading-none text-subdued transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}

// Signed-in only: /help is not in AppGate's PUBLIC_PATHS, so signed-out visitors see the intro screen.
export default function HelpPage() {
  return (
    <LegalPage title="Help & Support" lastUpdated={null}>
      <section>
        <h2>Frequently asked questions</h2>

        <Faq question="How do I allow the microphone?">
          <p>Convo needs your microphone for speaking exercises and voice messages.</p>
          <ul>
            <li>
              <strong>Chrome (computer or Android):</strong> tap the icon to the left of the address
              bar, open <em>Permissions</em> (or <em>Site settings</em>) and set Microphone to{" "}
              <em>Allow</em>. Then reload the page.
            </li>
            <li>
              <strong>Safari on iPhone:</strong> tap <em>aA</em> in the address bar →{" "}
              <em>Website Settings</em> → Microphone → <em>Allow</em>. If it&apos;s still blocked, go
              to Settings → Apps → Safari → Microphone and choose <em>Ask</em> or <em>Allow</em>.
            </li>
            <li>
              <strong>Android:</strong> also check that the browser itself may use the microphone:
              Settings → Apps → Chrome (or your browser) → Permissions → Microphone →{" "}
              <em>Allow only while using the app</em>.
            </li>
          </ul>
        </Faq>

        <Faq question="There's no Chinese voice, or the voice sounds different">
          <p>
            Chinese audio is read aloud by your device&apos;s built-in speech voices. Convo picks a
            Mandarin (Chinese, China) voice automatically, so how it sounds depends on the voices
            your device has. If none is installed you&apos;ll see &ldquo;No Chinese voice
            found&rdquo;.
          </p>
          <ul>
            <li>
              <strong>iPhone:</strong> Settings → Accessibility → Spoken Content → Voices → Chinese
              (China mainland), then download a voice. Reopen Safari afterwards.
            </li>
            <li>
              <strong>Android:</strong> Settings → search &ldquo;Text-to-speech&rdquo; → preferred
              engine settings (e.g. Speech Services by Google) → Install voice data → Chinese
              (Mandarin). Then restart the browser.
            </li>
          </ul>
        </Faq>

        <Faq question="“Pronunciation check is unavailable”">
          <p>
            This means our AI service is busy or couldn&apos;t be reached for a moment. Please try
            again in a little while.
          </p>
          <p>
            You can keep practising in the meantime: listen to your recording, compare it with the
            correct answer and choose whether you said it right.
          </p>
        </Faq>

        <Faq question="How does the free trial work?">
          <p>
            Premium is currently free during early access. Starting the trial unlocks Premium for 7
            days. Each account can start it once. There are no payments: we never ask for card
            details, and nothing renews or charges you when the week ends.
          </p>
        </Faq>

        <Faq question="Why is my progress gone on another device?">
          <p>
            Your lesson progress, statistics and custom scenarios are saved in this browser, kept
            separately for each account. They aren&apos;t uploaded, so they don&apos;t follow you to
            another browser or device, and clearing your browser data removes them. Your account,
            level and Premium status do carry over when you sign in elsewhere.
          </p>
        </Faq>
      </section>

      <section>
        <h2>Still need help?</h2>
        <SupportActions />
      </section>

      <nav
        aria-label="Legal"
        className="flex items-center justify-center gap-2 border-t border-border pt-5 text-sm"
      >
        <Link href="/terms">Terms of Use</Link>
        <span aria-hidden className="text-subdued">
          •
        </span>
        <Link href="/privacy">Privacy Policy</Link>
      </nav>
    </LegalPage>
  );
}
