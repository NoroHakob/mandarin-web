import type { Metadata } from "next";
import Link from "next/link";
import LegalPage from "@/components/legal/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use · Convo",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use">
      <section>
        <p>
          By using Convo you agree to these terms. If you don&apos;t agree, please don&apos;t use
          the app.
        </p>
      </section>

      <section>
        <h2>Educational use only</h2>
        <p>
          Convo is a learning tool for practising Mandarin. It is not a certified course, a
          translation service or professional advice. Don&apos;t rely on it for anything important,
          such as medical, legal or travel matters.
        </p>
      </section>

      <section>
        <h2>AI can make mistakes</h2>
        <p>
          Conversations, transcriptions, pronunciation feedback and custom scenarios are produced by
          AI (Google Gemini). They can be wrong, incomplete or odd. Check anything important with a
          reliable source or a teacher.
        </p>
      </section>

      <section>
        <h2>No guarantees</h2>
        <p>
          The app is provided &quot;as is&quot;, without warranties of any kind. We don&apos;t
          guarantee that it will always be available, error-free or that it will help you reach a
          particular level. Features may change or be removed. To the extent the law allows, we are
          not liable for any loss arising from your use of the app.
        </p>
      </section>

      <section>
        <h2>Premium</h2>
        <p>
          During early access, Premium is a free 7-day trial, available once per account. There are
          no payments: we never ask for or charge a card, and the trial simply ends after 7 days. If
          paid plans are introduced later, we will update these terms and ask you before charging
          anything.
        </p>
      </section>

      <section>
        <h2>Your account</h2>
        <p>
          Keep access to your email or Google account secure, since it is how you sign in.
          Don&apos;t misuse the app: no attempts to break it, overload it, get around its limits or
          use it to create harmful content. We may limit or close accounts that do.
        </p>
      </section>

      <section>
        <h2>Privacy</h2>
        <p>
          How we handle your data is described in our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          We may update these terms; the date at the top shows the latest version. Questions? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
