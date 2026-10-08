/**
 * Removes invisible characters that sneak into environment variables when they're pasted or piped in
 * (a Windows byte-order mark from PowerShell, zero-width spaces, stray spaces or newlines). One of these on
 * GOOGLE_CLIENT_ID made Google reject every sign-in with "invalid_client" while the value looked correct.
 * Runs once at server start (instrumentation) and before auth reads its config.
 */
const INVISIBLE = /[﻿​‌‍⁠]/g;

export function cleanEnvValue(value: string): string {
  return value.replace(INVISIBLE, "").trim();
}

let done = false;

export function sanitizeProcessEnv(env: NodeJS.ProcessEnv = process.env): string[] {
  if (env === process.env && done) return [];
  const changed: string[] = [];
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== "string") continue;
    const clean = cleanEnvValue(value);
    if (clean !== value) {
      env[key] = clean;
      changed.push(key);
    }
  }
  if (env === process.env) {
    done = true;
    // Names only - never values.
    if (changed.length) console.warn(`Cleaned invisible characters/whitespace from env vars: ${changed.join(", ")}`);
  }
  return changed;
}
