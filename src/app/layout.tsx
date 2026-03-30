import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: {
    default: "Delphi Oracle — See Your Future Branches",
    template: "%s · Delphi Oracle",
  },
  description:
    "An agentic AI simulator that maps your possible futures as an interactive branching timeline. Powered by your digital footprint.",
  keywords: [
    "AI future simulator",
    "life planning",
    "decision trees",
    "agentic AI",
    "future prediction",
  ],
  authors: [{ name: "Delphi Oracle" }],
  creator: "Delphi Oracle",
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Delphi Oracle — See Your Future Branches",
    description: "Map your possible futures with AI-powered branching timeline simulation.",
    siteName: "Delphi Oracle",
  },
  twitter: {
    card: "summary_large_image",
    title: "Delphi Oracle",
    description: "Map your possible futures with AI-powered branching timeline simulation.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b14",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
