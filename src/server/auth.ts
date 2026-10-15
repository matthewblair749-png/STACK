import NextAuth, { type NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "./db";
import { sanitizeProcessEnv } from "./env";
import { COMING_SOON } from "@/lib/launch";

// Before anything below reads a client ID or secret (see env.ts for why).
sanitizeProcessEnv();

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

// Resend's shared sandbox sender (anything @resend.dev) only delivers to the Resend account owner's
// own inbox. Offering email sign-in with it in production would show real users "check your email"
// for a link that never arrives - so it's only enabled once EMAIL_FROM is on a verified domain.
const sandboxSender = /@resend\.dev$/i.test(process.env.EMAIL_FROM ?? "");
if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM && !(sandboxSender && process.env.NODE_ENV === "production")) {
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
    // Failed sign-ins land back on the login page with a plain explanation, not Auth.js's generic error page.
    error: "/login",
  },
  callbacks: {
    // Until launch, every sign-in (Google or email link) is refused before an account is created or an email is sent.
    signIn() {
      return !COMING_SOON;
    },
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
