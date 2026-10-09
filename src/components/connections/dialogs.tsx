"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink, X } from "lucide-react";
import { IntegrationLogo } from "@/components/brand-icons";
import { providerLabel } from "@/lib/providers-meta";
import { destinationsFor } from "@/lib/data-groups";
import { cn } from "@/lib/utils";
import type { CatalogApp } from "./types";

/** Real, clickable pointers to the tab(s) this app's data will actually land in. */
function WhereYouSeeIt({ providerId }: { providerId: string | null }) {
  const destinations = providerId ? destinationsFor(providerId) : [];
  if (destinations.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Where you&apos;ll see it</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {destinations.map((d) => (
          <Link key={d.href} href={d.href} className="flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-xs font-medium text-ink hover:border-ink">
            {d.label} <ArrowRight size={11} />
          </Link>
        ))}
      </div>
    </div>
  );
}

export function Modal({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/30 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={label} onClick={onClose}>
      <div className="w-full max-w-lg rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const primary = "rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50";
const ghost = "rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100";

/** Shown before every authorization: exactly what STACK will and won't do, in plain words. */
export function PermissionSheet({ app, onCancel, onContinue, onUseToken }: { app: CatalogApp; onCancel: () => void; onContinue: () => void; onUseToken?: () => void }) {
  const meta = app.meta;
  const provider = app.oauthProviderId ? providerLabel(app.oauthProviderId) : app.name;
  return (
    <Modal label={`Connect ${app.name}`} onClose={onCancel}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-50">
          <IntegrationLogo app={app.oauthProviderId ?? app.slug} name={app.name} size="md" logoPath={app.logoPath} />
        </span>
        <div>
          <p className="text-base font-semibold text-ink">Connect {app.name}</p>
          {provider !== app.name && <p className="text-xs text-neutral-500">Signs in with {provider}</p>}
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Read access - STACK will</p>
          <ul className="mt-2 space-y-1.5">
            {(meta?.read ?? ["Read the data you authorize"]).map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-ink"><Check size={14} className="mt-0.5 shrink-0 text-green" /> {r}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">STACK will not</p>
          <ul className="mt-2 space-y-1.5">
            {(meta?.wont ?? ["Change or delete anything"]).map((r) => (
              <li key={r} className="flex items-start gap-2 text-sm text-ink"><X size={14} className="mt-0.5 shrink-0 text-red" /> {r}</li>
            ))}
          </ul>
        </div>
      </div>

      <WhereYouSeeIt providerId={app.oauthProviderId} />

      {meta && meta.act.length > 0 && (
        <div className="mt-4 rounded-xl bg-neutral-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Action access - optional, always with your approval</p>
          <p className="mt-1 text-sm text-ink">{meta.act.join(", ")}</p>
          {meta.actNote && <p className="mt-1 text-xs text-neutral-500">{meta.actNote}</p>}
        </div>
      )}

      <p className="mt-4 text-xs text-neutral-500">You&apos;ll approve this on {provider}&apos;s own page. You can disconnect at any time.</p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        {onUseToken ? (
          <button className="text-xs font-medium text-neutral-500 underline hover:text-ink" onClick={onUseToken}>
            Sign-in not working? Connect with a token instead
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button className={ghost} onClick={onCancel}>Cancel</button>
          <button className={primary} onClick={onContinue}>Continue to {app.name}</button>
        </div>
      </div>
    </Modal>
  );
}

/** Asks for details the app needs before sign-in can start (e.g. a Shopify store address). */
export function FieldsDialog({ app, onCancel, onSubmit }: { app: CatalogApp; onCancel: () => void; onSubmit: (values: Record<string, string>) => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <Modal label={`Connect ${app.name}`} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(values);
        }}
      >
        <p className="text-base font-semibold text-ink">Connect {app.name}</p>
        {app.connectFields!.map((f, i) => (
          <label key={f.name} className="mt-4 block text-sm">
            <span className="font-medium text-ink">{f.label}</span>
            <input autoFocus={i === 0} required value={values[f.name] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))} placeholder={f.placeholder} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink" />
            {f.help && <span className="mt-1 block text-xs text-neutral-500">{f.help}</span>}
          </label>
        ))}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={ghost} onClick={onCancel}>Cancel</button>
          <button type="submit" className={primary}>Continue</button>
        </div>
      </form>
    </Modal>
  );
}

/** One-time developer setup for an app whose credentials STACK doesn't have yet. */
export function SetupDialog({ app, busy, error, onCancel, onSave }: { app: CatalogApp; busy: boolean; error: string | null; onCancel: () => void; onSave: (values: Record<string, string>) => void }) {
  const setup = app.setup!;
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  return (
    <Modal label={`Set up ${app.name}`} onClose={onCancel}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(values);
        }}
      >
        <p className="text-base font-semibold text-ink">Set up {app.name}</p>
        <p className="mt-1 text-sm text-neutral-500">One-time setup: {app.name} needs an app registered on its developer site so it can sign you in.</p>
        <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-neutral-700">
          <li>
            Open <a href={setup.consoleUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-blue underline">{setup.consoleLabel}</a>.
          </li>
          {setup.steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
        {app.oauthProviderId !== "trello" && (
          <div className="mt-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Redirect URL</p>
            <div className="mt-1 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-lg bg-neutral-50 px-3 py-2 text-xs text-ink">{setup.redirectUrl}</code>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-ink hover:border-ink"
                onClick={() => navigator.clipboard?.writeText(setup.redirectUrl).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1500); })}
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}
        {setup.canSave ? (
          <>
            {setup.vars.map((v) => (
              <label key={v.name} className="mt-4 block text-sm">
                <span className="font-medium text-ink">{v.label}</span>
                <input required type={v.secret ? "password" : "text"} autoComplete="off" spellCheck={false} value={values[v.name] ?? ""} onChange={(e) => setValues((x) => ({ ...x, [v.name]: e.target.value }))} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm outline-none focus:border-ink" />
              </label>
            ))}
            {error && <p className="mt-3 text-sm text-red">{error}</p>}
            <p className="mt-3 text-xs text-neutral-500">Saved to this computer&apos;s .env.local only - never sent anywhere else.</p>
          </>
        ) : (
          <p className="mt-4 text-sm text-neutral-600">Add these as environment variables in your hosting dashboard, then redeploy: <code className="font-mono text-xs">{setup.vars.map((v) => v.name).join(", ")}</code></p>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className={ghost} onClick={onCancel}>Cancel</button>
          {setup.canSave && <button type="submit" disabled={busy} className={primary}>{busy ? "Saving..." : "Save and continue"}</button>}
        </div>
      </form>
    </Modal>
  );
}

/**
 * Common wrong pastes, caught the moment they happen - before anything is sent. Each is a token that looks
 * right (and would even pass a basic check) but can't read the person's own data.
 */
const WRONG_TOKEN: Record<string, { test: RegExp; message: string }[]> = {
  slack: [
    { test: /^xoxb-/, message: "That's the Bot token (xoxb-). Copy the User OAuth Token instead - it starts with xoxp-." },
    { test: /^xapp-/, message: "That's an App-level token (xapp-). Copy the User OAuth Token instead - it starts with xoxp-." },
    { test: /^(?!xoxp-)/, message: "Slack user tokens start with xoxp-. Copy the User OAuth Token from the app's Install App page." },
  ],
  stripe: [
    { test: /^pk_/, message: "That's a publishable key (pk_), which can't read data. Create a restricted key (rk_) instead." },
  ],
};

function wrongTokenMessage(providerId: string | null | undefined, value: string): string | null {
  const v = value.trim();
  if (!providerId || v.length < 6) return null;
  return WRONG_TOKEN[providerId]?.find((w) => w.test.test(v))?.message ?? null;
}

/**
 * Step-by-step walkthrough for connecting with an access token the user creates in the app - no developer app of
 * ours needed. One instruction per screen, a button that opens the right page, and the paste box last.
 */
export function TokenDialog({ app, busy, error, onCancel, onSubmit }: { app: CatalogApp; busy: boolean; error: string | null; onCancel: () => void; onSubmit: (token: string, fields: Record<string, string>) => void }) {
  const t = app.tokenConnect!;
  const [step, setStep] = useState(0);
  const [token, setToken] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});
  const total = t.steps.length + 1; // the instructions, then the paste screen
  const onPasteScreen = step === total - 1;
  const opened = useRef(false);

  const wrong = wrongTokenMessage(app.oauthProviderId, token);
  const submit = () => {
    if (!wrong) onSubmit(token.trim(), extra);
  };

  return (
    <Modal label={`Connect ${app.name}`} onClose={onCancel}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-50">
          <IntegrationLogo app={app.oauthProviderId ?? app.slug} name={app.name} size="md" logoPath={app.logoPath} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-semibold text-ink">Connect {app.name}</p>
          <p className="text-xs text-neutral-500">Step {step + 1} of {total} - about a minute</p>
        </div>
      </div>

      <div className="mt-3 flex gap-1.5" aria-hidden>
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-ink" : "bg-neutral-100")} />
        ))}
      </div>

      {!onPasteScreen ? (
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Step {step + 1}</p>
          <p className="mt-1.5 text-lg font-medium leading-snug text-ink">{t.steps[step]}</p>
          {step === 0 && (
            <a
              href={t.helpUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                opened.current = true;
              }}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            >
              Open {app.name} <ExternalLink size={14} />
            </a>
          )}
          <p className="mt-5 text-xs text-neutral-500">STACK only reads what the token allows. You can delete the token in {app.name} at any time.</p>
        </div>
      ) : (
        <form
          className="mt-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <p className="text-lg font-medium leading-snug text-ink">Paste your token{t.fields?.length ? " and the details below" : ""}.</p>
          {(t.fields ?? []).map((f, i) => (
            <label key={f.name} className="mt-4 block text-sm">
              <span className="font-medium text-ink">{f.label}</span>
              <input required autoFocus={i === 0} value={extra[f.name] ?? ""} onChange={(e) => setExtra((x) => ({ ...x, [f.name]: e.target.value }))} placeholder={f.placeholder} className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-ink" />
              {f.help && <span className="mt-1 block text-xs text-neutral-500">{f.help}</span>}
            </label>
          ))}
          <label className="mt-4 block text-sm">
            <span className="font-medium text-ink">{t.label}</span>
            <div className="mt-1 flex gap-2">
              <input
                required
                autoFocus={!t.fields?.length}
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                onPaste={(e) => {
                  // Nothing else to fill in? Pasting the token is the last step, so connect right away.
                  const pasted = e.clipboardData.getData("text").trim();
                  if (!t.fields?.length && pasted.length >= 20 && !/\s/.test(pasted) && !busy && !wrongTokenMessage(app.oauthProviderId, pasted)) {
                    e.preventDefault();
                    setToken(pasted);
                    onSubmit(pasted, {});
                  }
                }}
                placeholder={t.placeholder}
                className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 font-mono text-sm outline-none focus:border-ink"
              />
              <button type="button" className="shrink-0 rounded-lg border border-neutral-200 px-3 py-2 text-xs font-semibold text-ink hover:border-ink" onClick={() => navigator.clipboard?.readText().then((v) => setToken(v.trim())).catch(() => {})}>
                Paste
              </button>
            </div>
          </label>
          {wrong && <p role="alert" className="mt-3 text-sm text-red">{wrong}</p>}
          {error && !wrong && <p className="mt-3 text-sm text-red">{error}</p>}
          <p className="mt-3 text-xs text-neutral-500">Stored encrypted and never shown again. Disconnecting deletes it.</p>
          <button type="submit" hidden />
        </form>
      )}

      <div className="mt-6 flex items-center justify-between gap-2">
        {step > 0 ? (
          <button type="button" className={ghost} onClick={() => setStep((s) => s - 1)}>Back</button>
        ) : (
          <button type="button" className={ghost} onClick={onCancel}>Cancel</button>
        )}
        <div className="flex items-center gap-2">
          {!onPasteScreen && (
            <button type="button" className="text-xs font-medium text-neutral-500 hover:text-ink" onClick={() => setStep(total - 1)}>
              I already have my token
            </button>
          )}
          {onPasteScreen ? (
            <button type="button" disabled={busy || token.length < 20 || !!wrong} className={primary} onClick={submit}>{busy ? "Checking..." : "Connect"}</button>
          ) : (
            <button type="button" className={primary} onClick={() => setStep((s) => s + 1)}>{step === total - 2 ? "I have my token" : "Next"}</button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export function DisconnectDialog({ app, busy, onCancel, onConfirm }: { app: CatalogApp; busy: boolean; onCancel: () => void; onConfirm: () => void }) {
  const provider = app.oauthProviderId ? providerLabel(app.oauthProviderId) : app.name;
  return (
    <Modal label={`Disconnect ${app.name}`} onClose={onCancel}>
      <p className="text-base font-semibold text-ink">Disconnect {provider} from STACK?</p>
      <p className="mt-2 text-sm text-neutral-600">
        STACK will stop syncing {provider}, revoke its access where {provider} allows that, and delete the {provider} content it imported (emails, events, files). You can reconnect any time and STACK will sync again.
      </p>
      <div className="mt-5 flex justify-end gap-2">
        <button className={ghost} onClick={onCancel}>Cancel</button>
        <button className="rounded-lg bg-red px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy} onClick={onConfirm}>{busy ? "Disconnecting..." : "Disconnect"}</button>
      </div>
    </Modal>
  );
}
