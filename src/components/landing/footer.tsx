import Link from "next/link";
import { Logo } from "@/components/logo";

const columns = [
  { title: "Product", links: ["Home", "AI Assistant", "Automations", "Integrations"] },
  { title: "Solutions", links: ["Employees", "Managers", "Teams", "Freelancers", "Executives"] },
  { title: "Resources", links: ["Docs", "Blog", "Changelog", "Support"] },
  { title: "Company", links: ["About", "Careers", "Contact", "Legal"] },
];

export function Footer() {
  return (
    <footer id="resources" className="border-t border-neutral-100">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <Logo size={24} />
            <p className="mt-3 max-w-[220px] text-sm text-neutral-500">All your work, together.</p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{col.title}</p>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#" className="text-sm text-neutral-700 hover:text-ink">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-neutral-100 pt-6 text-xs text-neutral-400 sm:flex-row">
          <p>© 2026 STACK, Inc. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="#" className="hover:text-ink">Security</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
