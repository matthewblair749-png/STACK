import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "STACK — All your work, together.",
  description:
    "STACK brings your tasks, projects, messages, meetings, files, calendars, and work apps together in one intelligent workspace.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: "/",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: `${SITE_NAME} — ${SITE_TAGLINE}`, description: SITE_DESCRIPTION },
};

const THEME_INIT = `try{var p=localStorage.getItem("stack-theme");var d=p==="dark"||(p!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){}var s=location.pathname;if(s==="/"||s.indexOf("/pricing")===0||s.indexOf("/privacy")===0||s.indexOf("/terms")===0)document.documentElement.dataset.surface="marketing";`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies the saved (or system) theme before the first paint so there is never a flash of the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
