import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import "@/styles/globals.css";
import { ToastProvider } from "@/components/ui/Toaster";
import { CookieBanner } from "@/components/ui/CookieBanner";

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
        {/* PostHog analytics — set NEXT_PUBLIC_POSTHOG_KEY in env to enable */}
        {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
          <Script
            id="posthog"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${process.env.NEXT_PUBLIC_POSTHOG_KEY}',{api_host:'https://us.i.posthog.com',person_profiles:'identified_only'})`,
            }}
          />
        )}
        <ToastProvider>{children}</ToastProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
