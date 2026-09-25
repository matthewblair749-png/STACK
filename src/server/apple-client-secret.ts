import { createSign } from "crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Apple requires the OAuth client secret to be a JWT signed with the private key from your
 * "Sign in with Apple" key (the .p8 file), not a static string. This builds that JWT from
 * env vars so nothing needs to run outside the app. Regenerated on every server start, which
 * naturally rotates it well within Apple's 6-month max lifetime.
 */
export function generateAppleClientSecret(): string {
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const clientId = process.env.APPLE_CLIENT_ID;
  const rawKey = process.env.APPLE_PRIVATE_KEY;

  if (!teamId || !keyId || !clientId || !rawKey) {
    throw new Error(
      "Apple sign-in requires APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, and APPLE_PRIVATE_KEY."
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", kid: keyId };
  const payload = {
    iss: teamId,
    iat: now,
    exp: now + 60 * 60 * 24 * 180,
    aud: "https://appleid.apple.com",
    sub: clientId,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const privateKey = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const signer = createSign("SHA256");
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });

  return `${signingInput}.${base64url(signature)}`;
}
