import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { SessionProvider } from "@/components/providers/session-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "STACK — All your work, together.",
  description:
    "STACK brings your tasks, projects, messages, meetings, files, calendars, and work apps together in one intelligent workspace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
