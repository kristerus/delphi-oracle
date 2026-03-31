import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import "@/styles/globals.css";
import { ToastProvider } from "@/components/ui/Toaster";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://delphi-oracle.app";
const OG_IMAGE = `${APP_URL}/og-image.png`;

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
    "scenario planning",
    "life decisions",
  ],
  authors: [{ name: "Delphi Oracle" }],
  creator: "Delphi Oracle",
  metadataBase: new URL(APP_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    title: "Delphi Oracle — See Your Future Branches",
    description: "Map your possible futures with AI-powered branching timeline simulation.",
    siteName: "Delphi Oracle",
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "Delphi Oracle — AI-powered future branching simulator",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Delphi Oracle",
    description: "Map your possible futures with AI-powered branching timeline simulation.",
    images: [OG_IMAGE],
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Delphi Oracle",
  applicationCategory: "AIApplication",
  operatingSystem: "Web",
  description:
    "An agentic AI simulator that maps your possible futures as an interactive branching timeline. Powered by your digital footprint.",
  url: APP_URL,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "AI-powered future simulation",
    "Interactive branching timeline",
    "Decision tree visualization",
    "Probability-weighted outcomes",
  ],
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
        <Script
          id="json-ld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
