"use client";

import { motion } from "framer-motion";
import { Check, Loader2, Monitor, Clock, Ban, AlertTriangle } from "lucide-react";
import type { Integration } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { IntegrationLogo } from "@/components/brand-icons";
import { cn } from "@/lib/utils";

const STATUS_ICON: Partial<Record<NonNullable<Integration["status"]>, typeof Monitor>> = {
  desktop_app: Monitor,
  external_tool: Clock,
  unavailable: Ban,
  error: AlertTriangle,
};

export function IntegrationCard({
  integration,
  onToggle,
  connecting = false,
  compact = false,
}: {
  integration: Integration;
  onToggle?: () => void;
  connecting?: boolean;
  compact?: boolean;
}) {
  const configured = integration.configured !== false;
  const status = integration.status ?? (integration.connected ? "connected" : configured ? "available" : "needs_setup");
  const actionable = status === "connected" || status === "available" || status === "needs_setup" || status === "error";
  const StatusIcon = STATUS_ICON[status];

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className="flex flex-col rounded-2xl border border-neutral-100 bg-white p-5"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-50">
          <IntegrationLogo app={integration.id} name={integration.name} size="md" logoPath={integration.logoPath} />
        </div>
        {status === "connected" && (
          <span className="flex items-center gap-1 rounded-full bg-blue-soft px-2.5 py-1 text-xs font-medium text-blue">
            <Check size={12} /> Connected
          </span>
        )}
        {StatusIcon && (
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium",
              status === "error" ? "bg-red-soft text-red" : "bg-neutral-100 text-neutral-500"
            )}
          >
            <StatusIcon size={12} />
            {status === "error"
              ? "Connection error"
              : status === "desktop_app"
                ? "Desktop app"
                : status === "unavailable"
                  ? "Unavailable"
                  : "Coming soon"}
          </span>
        )}
      </div>

      <p className="mt-4 text-sm font-semibold text-ink">{integration.name}</p>
      {!compact && <p className="mt-1.5 text-sm text-neutral-500">{integration.description}</p>}

      <div className="mt-4 flex items-center justify-between">
        {status === "connected" ? (
          <p className="text-xs text-neutral-400">Last synced: {integration.lastSynced}</p>
        ) : status === "needs_setup" ? (
          <span className="text-xs text-yellow-700">Needs setup</span>
        ) : (
          <span className="text-xs text-neutral-400">{integration.category}</span>
        )}
        {onToggle && (
          <Button
            size="sm"
            variant={status === "connected" || status === "error" ? "outline" : "primary"}
            onClick={onToggle}
            disabled={connecting || !actionable}
            title={
              status === "needs_setup"
                ? integration.missingSetup?.join("; ")
                : status === "error"
                  ? "The connection failed — reconnect to fix it."
                  : undefined
            }
          >
            {connecting
              ? <Loader2 size={14} className="animate-spin" />
              : status === "connected"
                ? "Disconnect"
                : status === "error"
                  ? "Reconnect"
                  : status === "needs_setup"
                    ? "Set up"
                    : status === "desktop_app"
                      ? "Desktop app"
                      : status === "unavailable"
                        ? "Unavailable"
                        : status === "external_tool"
                          ? "Coming soon"
                          : "Connect"}
          </Button>
        )}
      </div>
    </motion.div>
  );
}
