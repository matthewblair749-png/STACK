import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Privacy Policy - STACK" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 7, 2026">
      <p>STACK helps you understand, prioritize and act on your work by connecting the apps you already use. This policy explains what STACK collects, why, who it is shared with, and the control you have. We only access an app after you sign in to it and approve access yourself.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email address and sign-in method.</li>
        <li><strong>Data from apps you connect:</strong> only what you authorize. For example, from Google: email subject lines, senders and short previews, calendar event details, and Drive file names and links. From other apps: notifications, tasks, issues, meetings, deals or files, as described on each app&apos;s connection screen. STACK does not import passwords, and requests read-only access by default.</li>
        <li><strong>Content you create in STACK:</strong> tasks, projects, conversations with STACK AI, and the actions you approve.</li>
        <li><strong>Security records:</strong> when an app is connected or disconnected and when a sync fails. These never contain your tokens or message content.</li>
        <li><strong>Calls:</strong> who joined a STACK call and when. Audio and video travel directly between participants&apos; browsers; STACK does not record or store them.</li>
      </ul>

      <h2>How we use it</h2>
      <p>We use this data only to provide STACK&apos;s features to you: showing what needs your attention, answering your questions, preparing actions for your approval, and keeping your connected apps in sync. We do not sell your data. We do not use it for advertising, and we do not use it to build profiles for third parties.</p>

      <h2>Google user data</h2>
      <p>STACK&apos;s use and transfer to any other app of information received from Google APIs will adhere to the <a className="font-medium text-blue underline" href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>, including the Limited Use requirements.</p>
      <ul>
        <li>We use Google data only to provide and improve the user-facing features described above.</li>
        <li>We do not transfer Google data to others except to provide those features, to comply with the law, or as part of a merger or sale with notice to you.</li>
        <li>We do not use Google data for advertising, and we do not allow humans to read it unless you ask us to, it is needed for security or abuse investigation, or the law requires it.</li>
        <li>We do not use Google data to develop, improve or train generalized AI or machine-learning models.</li>
      </ul>

      <h2>AI processing</h2>
      <p>When you ask STACK AI a question, the relevant parts of your synced work (for example a few message previews or task titles) are sent to an AI model provider to produce the answer. We use Anthropic (Claude) and, as a fallback when Claude is unavailable, Groq. This data is sent only to answer your request. Both providers&apos; API terms say they don&apos;t use it to train their models. Each person has a daily limit on AI answers.</p>

      <h2>How we protect it</h2>
      <ul>
        <li>Access tokens, API keys and any other credentials for your connected apps are encrypted at rest (AES-256-GCM) and are never sent back to your browser.</li>
        <li>Most connections use the app&apos;s official sign-in (OAuth), so STACK never sees your password. Some apps only offer an API key or token you create yourself in that app and paste into STACK. One app (ServiceNow) only supports a username and password; for it we recommend a dedicated read-only account.</li>
        <li>Anything that would send, change or delete something in another app needs your explicit approval first.</li>
        <li>You only see information you are already allowed to see in the underlying app.</li>
      </ul>

      <h2>Your choices</h2>
      <ul>
        <li><strong>Disconnect an app</strong> at any time from Integrations. STACK then revokes its access where the app allows it, deletes the stored credentials, and deletes the content it imported from that app.</li>
        <li><strong>Revoke access yourself</strong> in the app&apos;s own settings, for example your Google Account&apos;s third-party access page.</li>
        <li><strong>Delete your account and data</strong> yourself, any time, from Settings. STACK revokes its access to every connected app where the app allows it, then permanently deletes your account, your workspace and everything imported into it.</li>
      </ul>

      <h2>Sharing and service providers</h2>
      <p>We share data only with the service providers that run STACK for us, under terms that limit them to providing those services, or when the law requires it. They are:</p>
      <ul>
        <li><strong>Vercel</strong> - hosts the website and app.</li>
        <li><strong>Neon</strong> - our database, where your account, imported data and encrypted credentials are stored.</li>
        <li><strong>Anthropic</strong> and <strong>Groq</strong> - AI answers, as described above.</li>
        <li><strong>Resend</strong> - delivers sign-in emails, when you sign in by email.</li>
        <li><strong>Stripe</strong> - payments, if paid plans are offered. STACK never sees or stores your card number.</li>
        <li><strong>Sentry</strong> - error reports, if enabled. Reports describe what broke in the app and are configured not to include your IP address, cookies or message content.</li>
        <li>The apps you choose to connect, which STACK reads from (and acts in only after you approve).</li>
      </ul>
      <p><strong>Shared workspaces:</strong> if you join or invite others to a workspace, its members can see each other&apos;s name, email address and role, plus the tasks, projects and calls in that workspace. Data from your connected apps (email, messages, files, meetings) and your AI chats stay private to you and are never shown to teammates. If you leave or are removed from a workspace, your connections and imported data in it are deleted; tasks you created stay with the team.</p>

      <h2>How long we keep data</h2>
      <ul>
        <li>Data imported from an app is kept while that app is connected, and deleted when you disconnect it, leave the workspace, or delete your account.</li>
        <li>Your tasks, projects and AI chats are kept until you delete them or your account.</li>
        <li>Sign-in sessions end after 30 days without use. Short-lived security records, such as rate-limit counters, are cleared within a day.</li>
        <li>Our database provider keeps short-term backups for disaster recovery, so deleted data can remain in those backups for a limited time before it ages out.</li>
      </ul>

      <h2>Cookies</h2>
      <p>STACK uses only the cookies it needs to work: one that keeps you signed in, one that remembers which workspace you were last in, and a short-lived one that protects an app connection while you sign in to it. There are no advertising or tracking cookies.</p>

      <h2>Your rights</h2>
      <p>You can see and delete your data in the product at any time, as described above. To get a copy of your data, or for any other privacy request, contact us at the address below and we will respond within 30 days.</p>

      <h2>Children</h2>
      <p>STACK is a work tool for people aged 16 and over. It isn&apos;t directed at children, and we don&apos;t knowingly collect their data. If you believe a child has an account, contact us and we will delete it.</p>

      <h2>Changes and contact</h2>
      <p>If we change this policy in a meaningful way, we will update the date above and, where appropriate, tell you in the product.</p>
      <ContactLine />
    </LegalPage>
  );
}
