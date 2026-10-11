/**
 * Why an approved action didn't finish, said honestly:
 * - "not_done": STACK knows nothing happened (checked before sending, or the app answered with an error).
 * - "unknown": the request may have reached the app but no answer came back, so it might have happened.
 */
export class ActionError extends Error {
  constructor(
    message: string,
    public certainty: "not_done" | "unknown",
  ) {
    super(message);
    this.name = "ActionError";
  }
}

/**
 * Sends one write to a provider. A network failure (no response) is "unknown" - the write may have landed - so the
 * person is told to check before retrying, never told that nothing changed.
 */
export async function providerWrite(appLabel: string, what: string, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new ActionError(`The connection dropped before ${appLabel} answered, so STACK can't confirm whether it managed to ${what}. Check ${appLabel} before trying again.`, "unknown");
  }
}

/** The app answered with an error: nothing was done. The raw body goes to server logs, not to the person. */
export async function rejectedBy(appLabel: string, what: string, res: Response): Promise<never> {
  const body = await res.text().catch(() => "");
  console.warn(`${appLabel} write failed: ${res.status} ${body.replace(/\s+/g, " ").slice(0, 300)}`);
  // A server error may come after the write already happened, so it can't be reported as "nothing changed".
  if (res.status >= 500) {
    throw new ActionError(`${appLabel} had a problem on its side, so STACK can't confirm whether it managed to ${what}. Check ${appLabel} before trying again.`, "unknown");
  }
  const why =
    res.status === 401 || res.status === 403
      ? `${appLabel} refused permission. Reconnect ${appLabel} and try again.`
      : res.status === 429
        ? `${appLabel} is limiting requests right now. Try again in a minute.`
        : `${appLabel} rejected the request (error ${res.status}).`;
  throw new ActionError(`Couldn't ${what}: ${why} Nothing was changed.`, "not_done");
}
