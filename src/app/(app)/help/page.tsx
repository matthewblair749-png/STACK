import Link from "next/link";
import { Mail, Keyboard, Shield, Plug } from "lucide-react";
import { Card, SectionLabel } from "@/components/ui/card";

const SHORTCUTS = [
  { keys: ["Ctrl / ⌘", "K"], does: "Search everything, or run a command" },
  { keys: ["Ctrl / ⌘", "J"], does: "Ask STACK (on Home)" },
  { keys: ["/"], does: "Jump to the Ask STACK box (on Home)" },
];

const FAQ = [
  {
    q: "Why don't I see anything from an app?",
    a: "Connect it under Connected Apps, then press Sync now. If an app shows a problem there, its card says what went wrong and how to fix it.",
  },
  {
    q: "Can STACK send or change things without me?",
    a: "No. STACK drafts emails, messages, tasks and other changes, and nothing happens in your apps until you press Approve.",
  },
  {
    q: "Who can see my email and messages?",
    a: "Only you. Teammates in a shared workspace see shared tasks, projects and calls, never your connected apps or AI chats.",
  },
  {
    q: "How do I delete my data?",
    a: "Disconnecting an app deletes what STACK imported from it. Settings > Delete account removes your account and everything in it.",
  },
];

export default function HelpPage() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <SectionLabel>Help &amp; support</SectionLabel>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {email && (
          <a href={`mailto:${email}?subject=STACK%20support`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">
            <Card hover className="flex h-full items-center gap-4">
              <Icon><Mail size={18} /></Icon>
              <div>
                <p className="text-sm font-medium text-ink">Email support</p>
                <p className="text-sm text-neutral-500">{email}</p>
              </div>
            </Card>
          </a>
        )}
        <Link href="/integrations" className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue">
          <Card hover className="flex h-full items-center gap-4">
            <Icon><Plug size={18} /></Icon>
            <div>
              <p className="text-sm font-medium text-ink">Connected Apps</p>
              <p className="text-sm text-neutral-500">Connect, reconnect or disconnect your apps.</p>
            </div>
          </Card>
        </Link>
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><Keyboard size={15} /> Keyboard shortcuts</h2>
        <dl className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
          {SHORTCUTS.map((s) => (
            <div key={s.does} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
              <dt className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="rounded-md border border-neutral-200 bg-neutral-25 px-1.5 py-0.5 font-mono text-xs text-ink">{k}</kbd>
                ))}
              </dt>
              <dd className="text-right text-neutral-600">{s.does}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold text-ink">Common questions</h2>
        <div className="mt-3 space-y-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group rounded-xl border border-neutral-100 px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-ink">{f.q}</summary>
              <p className="mt-2 text-sm text-neutral-600">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <p className="mt-8 flex items-center gap-2 text-xs text-neutral-500">
        <Shield size={13} />
        <Link href="/privacy" className="underline">Privacy Policy</Link>
        <span aria-hidden>·</span>
        <Link href="/terms" className="underline">Terms of Service</Link>
      </p>
    </div>
  );
}

function Icon({ children }: { children: React.ReactNode }) {
  return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-blue">{children}</div>;
}
