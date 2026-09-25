"use client";

import { Plus } from "lucide-react";
import { useDemo } from "@/lib/demo-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeamPage() {
  const { people, projects, workspace } = useDemo();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {people.length} member{people.length === 1 ? "" : "s"} in {workspace?.name ?? "your workspace"}.
        </p>
        <Button size="sm" disabled title="Team invites aren't available yet — this is a single-workspace build for now.">
          <Plus size={14} /> Invite member
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {people.map((p) => {
          const projectCount = projects.filter((proj) => proj.memberIds.includes(p.id)).length;
          return (
            <Card key={p.id} className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">{p.initials}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-ink">{p.name}</p>
                <p className="text-xs text-neutral-400">{p.role}</p>
              </div>
              <span className="text-xs text-neutral-400">{projectCount} project{projectCount === 1 ? "" : "s"}</span>
            </Card>
          );
        })}
        {people.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-neutral-400">Loading team...</p>
        )}
      </div>
    </div>
  );
}
