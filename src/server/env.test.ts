import { describe, expect, it } from "vitest";
import { cleanEnvValue, sanitizeProcessEnv } from "./env";

describe("env sanitizing", () => {
  it("removes a byte-order mark and zero-width characters", () => {
    expect(cleanEnvValue("\uFEFF123-abc.apps.googleusercontent.com")).toBe("123-abc.apps.googleusercontent.com");
    expect(cleanEnvValue("key\u200Bvalue")).toBe("keyvalue");
  });

  it("trims surrounding whitespace and newlines but keeps inner text", () => {
    expect(cleanEnvValue("  secret value \r\n")).toBe("secret value");
  });

  it("reports the names it cleaned and fixes them in place", () => {
    const env = { GOOGLE_CLIENT_ID: "\uFEFFid", OK: "fine" } as unknown as NodeJS.ProcessEnv;
    expect(sanitizeProcessEnv(env)).toEqual(["GOOGLE_CLIENT_ID"]);
    expect(env.GOOGLE_CLIENT_ID).toBe("id");
    expect(env.OK).toBe("fine");
  });
});
