import type { ReactNode } from "react";
import { LandingNav } from "@/components/landing/nav";
import { Footer } from "@/components/landing/footer";
import { DeskSurface, PaperSheet } from "@/components/desk-surface";

/** Shared shell for the public legal pages (privacy, terms). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <DeskSurface className="flex flex-col">
      <LandingNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-24 pt-16 sm:px-6 sm:pt-20">
        {/* A legal document is a document: one long sheet of paper, tabbed like a file. */}
        <div className="relative mt-8">
          <PaperSheet pages={false} tab={title} className="px-6 py-10 sm:px-12 sm:py-14">
            <h1 className="text-3xl font-semibold tracking-[-0.025em] text-ink sm:text-4xl">{title}</h1>
            <p className="mt-2 text-sm text-neutral-500">Last updated: {updated}</p>
            <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-neutral-700 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
          </PaperSheet>
        </div>
      </main>
      <Footer />
    </DeskSurface>
  );
}

/** Where people reach us. Set NEXT_PUBLIC_CONTACT_EMAIL; until then the page says so plainly instead of inventing an address. */
export function ContactLine() {
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
  return email ? (
    <p>
      Questions or requests: <a className="font-medium text-blue underline" href={`mailto:${email}`}>{email}</a>.
    </p>
  ) : (
    <p>Questions or requests: use the contact option on our website.</p>
  );
}
