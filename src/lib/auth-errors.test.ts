import { describe, expect, it } from "vitest";
import { signInErrorMessage } from "./auth-errors";

describe("sign-in error messages", () => {
  it("explains every code Auth.js sends", () => {
    for (const code of ["Configuration", "AccessDenied", "Verification", "Signin", "OAuthSignin", "OAuthCallbackError", "OAuthCreateAccount", "EmailCreateAccount", "Callback", "OAuthAccountNotLinked", "EmailSignin", "CredentialsSignin", "SessionRequired"]) {
      expect(signInErrorMessage(code)).not.toBe("Sign-in didn't work. Try again.");
    }
  });
  it("has a generic message for unknown codes and none without a code", () => {
    expect(signInErrorMessage("SomethingNew")).toBe("Sign-in didn't work. Try again.");
    expect(signInErrorMessage(undefined)).toBeUndefined();
    expect(signInErrorMessage("")).toBeUndefined();
  });
});
