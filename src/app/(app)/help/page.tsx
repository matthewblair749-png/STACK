import { HelpCircle, MessageSquare, BookOpen } from "lucide-react";
import { Card, SectionLabel } from "@/components/ui/card";

const links = [
  { icon: BookOpen, title: "Getting started with STACK", desc: "Learn how tasks, projects, and AI fit together." },
  { icon: MessageSquare, title: "Contact support", desc: "We usually reply within a few hours." },
  { icon: HelpCircle, title: "Keyboard shortcuts", desc: "Press ⌘K anywhere to search or run a command." },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-8">
      <SectionLabel>Help &amp; support</SectionLabel>
      <div className="mt-4 space-y-3">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Card key={l.title} hover className="flex items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-soft text-blue">
                <Icon size={18} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">{l.title}</p>
                <p className="text-sm text-neutral-500">{l.desc}</p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
