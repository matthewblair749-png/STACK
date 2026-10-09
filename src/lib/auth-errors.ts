/**
 * What to tell someone who lands back on /login or /signup with Auth.js's `?error=` code. Every code Auth.js
 * sends (ErrorPageParam and SignInPageErrorParam) has a sentence that says what happened and what to try;
 * an unknown code gets the generic one, and no code means no message.
 */
const MESSAGES: Record<string, string> = {
  // The provider sign-in was cancelled, or the account isn't allowed in (for example a Google app in testing).
  AccessDenied: "That account couldn't sign in to STACK. Try again, or use a different sign-in option.",
  OAuthCallbackError: "Sign-in was cancelled or didn't finish. Try again.",
  OAuthSignin: "STACK couldn't start that sign-in. Try again, or use a different sign-in option.",
  Signin: "STACK couldn't start that sign-in. Try again, or use a different sign-in option.",
  Callback: "Sign-in didn't finish. Try again.",
  OAuthCreateAccount: "STACK couldn't create your account with that sign-in. Try again, or use a different option.",
  EmailCreateAccount: "STACK couldn't create your account with that email. Try again.",
  OAuthAccountNotLinked: "That email already has a STACK account with a different sign-in. Use the option you signed up with.",
  EmailSignin: "STACK couldn't send the sign-in email. Check the address and try again in a few minutes.",
  Verification: "That sign-in link has expired or was already used. Request a new one.",
  SessionRequired: "Sign in to continue.",
  CredentialsSignin: "Sign-in didn't work. Check your details and try again.",
  Configuration: "Sign-in isn't working on STACK's side right now. Try again later.",
};

export function signInErrorMessage(code: string | undefined): string | undefined {
  if (!code) return undefined;
  return MESSAGES[code] ?? "Sign-in didn't work. Try again.";
}
