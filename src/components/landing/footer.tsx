import Link from "next/link";
import { Logo } from "@/components/logo";

/** Only links that go somewhere real. (Pages like Blog, Careers or Docs get added here when they exist.) */
const columns = [
  { title: "Product", links: [{ label: "Overview", href: "/#product" }, { label: "Integrations", href: "/#integrations" }, { label: "Pricing", href: "/pricing" }] },
  { title: "Account", links: [{ label: "Get started", href: "/signup" }, { label: "Sign in", href: "/login" }] },
  { title: "Legal", links: [{ label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }] },
];

export function Footer() {
  const contact = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return (
    <footer id="resources" className="border-t border-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo size={24} />
            <p className="mt-3 max-w-[220px] text-sm text-neutral-500">All your work, together.</p>
            {contact && (
              <a href={`mailto:${contact}`} className="mt-3 inline-block text-sm text-neutral-700 hover:text-ink">{contact}</a>
            )}
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{col.title}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-neutral-700 hover:text-ink">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 border-t border-neutral-100 pt-6 text-center text-xs text-neutral-400 sm:text-left">
          <p>© 2026 STACK. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
