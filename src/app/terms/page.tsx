import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/legal/legal-page";

export const metadata: Metadata = { title: "Terms of Service - STACK" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="October 2, 2026">
      <p>These terms govern your use of STACK. By creating an account or using STACK you agree to them. If you use STACK for an organization, you confirm you may accept these terms for it.</p>

      <h2>The service</h2>
      <p>STACK connects to the work apps you choose and helps you understand, prioritize and act on your work. Features that depend on a connected app work only while that app&apos;s connection and its own service are available.</p>

      <h2>Your account and connected apps</h2>
      <ul>
        <li>Keep your sign-in secure and tell us if you think it has been compromised.</li>
        <li>Connect only accounts you are entitled to connect. Connecting an app means you authorize STACK to access what the connection screen describes.</li>
        <li>You are responsible for making sure your use of STACK with those apps complies with their terms and with your organization&apos;s policies.</li>
      </ul>

      <h2>Actions taken for you</h2>
      <p>STACK prepares actions such as creating a task, sending a message or scheduling a meeting, and asks for your approval before doing anything that changes another app or communicates with another person. Review each action before you approve it. You are responsible for what you approve.</p>

      <h2>AI output</h2>
      <p>STACK AI can make mistakes. It is meant to help you find and organize your own information, not to replace your judgment. Check important details against the original source, which STACK links to wherever it can.</p>

      <h2>Acceptable use</h2>
      <ul>
        <li>Do not use STACK to break the law, infringe others&apos; rights, or access data you are not permitted to access.</li>
        <li>Do not attempt to disrupt, probe or reverse engineer the service, or use it to build a competing product.</li>
        <li>Do not overload the service or connected apps with automated requests.</li>
      </ul>

      <h2>Your data</h2>
      <p>You keep ownership of your data and of the content in your connected apps. We handle it as described in our <Link className="font-medium text-blue underline" href="/privacy">Privacy Policy</Link>. You can disconnect apps at any time, and delete your account and all of its data yourself from Settings.</p>

      <h2>Plans, payment and usage limits</h2>
      <p>STACK is free to use during early access. Each account includes a daily number of full AI answers; past it, STACK keeps answering from your synced data without an AI model until the limit resets. If we introduce paid plans, we will tell you before anything is charged, they will be billed as shown when you subscribe, and you will be able to cancel at any time, effective at the end of the current billing period.</p>

      <h2>Availability and changes</h2>
      <p>We work to keep STACK available but do not promise it will always be uninterrupted or error-free. We may improve, change or discontinue features, and will give reasonable notice of changes that materially affect you.</p>

      <h2>Disclaimers and liability</h2>
      <p>STACK is provided &quot;as is&quot; to the extent the law allows. To the extent the law allows, we are not liable for indirect or consequential losses, and our total liability for any claim is limited to the amount you paid us in the 12 months before it arose. Nothing here limits liability that cannot be limited by law.</p>

      <h2>Ending your use</h2>
      <p>You can stop using STACK at any time. We may suspend or end access if you breach these terms or put the service or others at risk.</p>

      <h2>Changes and contact</h2>
      <p>We may update these terms and will change the date above when we do. Continuing to use STACK after an update means you accept it.</p>
      <ContactLine />
    </LegalPage>
  );
}
