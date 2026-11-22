import type { Metadata } from "next";
import LegalPage from "@/components/legal/LegalPage";
import { CONTACT_EMAIL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy · Convo",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <section>
        <p>
          Convo is an app for practising spoken Mandarin. This page explains, in plain language,
          what data the app uses, where it goes and how to have it deleted.
        </p>
      </section>

      <section>
        <h2>What we store on our servers</h2>
        <p>
          Your account lives in Supabase, our database and sign-in provider. For each account we
          store:
        </p>
        <ul>
          <li>your email address and, if you give one, your name;</li>
          <li>
            your onboarding answers: your Chinese level, your reasons for learning and your
            interests;
          </li>
          <li>whether you have Premium and when your free trial ends;</li>
          <li>
            simple usage counters (how many AI requests you made in the last hour or day), kept for
            at most two days to stop abuse.
          </li>
        </ul>
      </section>

      <section>
        <h2>What stays in your browser</h2>
        <p>
          Your lesson progress, your speaking and listening statistics and the custom scenarios you
          create are saved only in your browser&apos;s local storage, kept separately for each
          account that signs in on that browser. Someone else signing in on the same browser
          won&apos;t see yours. This data is not sent to our servers, so it doesn&apos;t follow you
          to another browser or device, and clearing your browser data removes it.
        </p>
      </section>

      <section>
        <h2>Voice recordings and chat messages</h2>
        <p>
          When you record yourself, send a chat message or create a custom scenario, the recording
          or text is sent through our server to Google&apos;s Gemini API, which transcribes it or
          writes a reply. We do not store your recordings or messages, and we do not log them.
        </p>
        <p>
          We currently use Gemini&apos;s free tier. Under Google&apos;s terms for the free tier,
          Google may use the content it receives to improve its products, and it may be reviewed by
          people at Google. Please don&apos;t include personal or sensitive information in what you
          say or type.
        </p>
        <p>
          Spoken Chinese in lessons is read aloud by your browser&apos;s built-in speech feature.
          Depending on your browser, that may be handled by your browser or operating system vendor.
        </p>
      </section>

      <section>
        <h2>Signing in</h2>
        <p>
          You can sign in with an email magic link or with Google. If you use Google, Google tells
          us your email address and basic profile details (such as your name); we never see your
          Google password. Your sign-in session is kept in your browser.
        </p>
      </section>

      <section>
        <h2>Hosting</h2>
        <p>
          The app runs on Vercel. Like any web host, Vercel processes technical data such as your IP
          address and browser type when it delivers pages to you.
        </p>
      </section>

      <section>
        <h2>What we don&apos;t do</h2>
        <ul>
          <li>We don&apos;t sell your data.</li>
          <li>We don&apos;t show ads or use advertising trackers.</li>
          <li>We don&apos;t take payments, so we hold no payment details.</li>
        </ul>
      </section>

      <section>
        <h2>Deleting your account</h2>
        <p>
          To delete your account and everything we store about you, email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you sign in with.
          We will delete it and confirm within 30 days. To remove the data kept in your browser,
          clear this site&apos;s data in your browser settings.
        </p>
      </section>

      <section>
        <h2>Changes and contact</h2>
        <p>
          If this policy changes, we will update the date at the top of this page. Questions? Email{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
      </section>
    </LegalPage>
  );
}
