import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Apple from "next-auth/providers/apple";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { generateAppleClientSecret } from "./apple-client-secret";

const providers: NextAuthConfig["providers"] = [];

export const configuredAuthProviders: { id: string; name: string }[] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
  configuredAuthProviders.push({ id: "google", name: "Google" });
}

if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
  const tenant = process.env.MICROSOFT_TENANT_ID || "common";
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.MICROSOFT_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
      issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    })
  );
  configuredAuthProviders.push({ id: "microsoft-entra-id", name: "Microsoft" });
}

if (
  process.env.APPLE_CLIENT_ID &&
  process.env.APPLE_TEAM_ID &&
  process.env.APPLE_KEY_ID &&
  process.env.APPLE_PRIVATE_KEY
) {
  try {
    providers.push(
      Apple({
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: generateAppleClientSecret(),
      })
    );
    configuredAuthProviders.push({ id: "apple", name: "Apple" });
  } catch (err) {
    console.error("Apple sign-in is misconfigured, skipping provider:", err);
  }
}

if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
  providers.push(
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
    })
  );
  configuredAuthProviders.push({ id: "resend", name: "Email" });
}

export const authIsConfigured = providers.length > 0;

async function bootstrapWorkspace(userId: string) {
  const existing = await db.workspaceMember.findFirst({ where: { userId } });
  if (existing) return;

  const user = await db.user.findUnique({ where: { id: userId } });
  const workspaceName = user?.name ? `${user.name}'s Workspace` : "My Workspace";

  await db.workspace.create({
    data: {
      name: workspaceName,
      ownerId: userId,
      members: { create: { userId, role: "Owner" } },
      subscription: { create: { plan: "Free", status: "Active" } },
    },
  });
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  trustHost: true,
  providers,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      if (user.id) {
        await bootstrapWorkspace(user.id);
      }
    },
  },
});
