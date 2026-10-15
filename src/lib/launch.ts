/**
 * STACK isn't open yet. Until launch, sign-in is switched off, the app's pages are closed (even to an existing
 * session), and the public site shows when it opens instead of sign-up buttons.
 *
 * To open STACK, set NEXT_PUBLIC_STACK_OPEN=1 and redeploy (NEXT_PUBLIC_ values are read at build time).
 */
export const COMING_SOON = process.env.NEXT_PUBLIC_STACK_OPEN !== "1";

/** When STACK opens, as the site says it. */
export const LAUNCH_MONTH = "December 2026";
export const LAUNCH_SHORT = "Dec 2026";

/** The pages people use to get in; while STACK is closed they all show the "coming soon" card. */
export const SIGN_IN_PATHS = ["/login", "/signup", "/forgot-password"];
