import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { NotificationCenter } from "@/components/notification-center";
import { SiteFooter } from "@/components/site-footer";

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "GGMarket — The marketplace for gamers", template: "%s | GGMarket" },
  description: "Buy and sell gaming hardware, games, and gear with gamers near you.",
  openGraph: { title: "GGMarket", description: "Buy. Sell. Trade. Upgrade.", type: "website", images: [{ url: "/brand/ggmarket-open-graph.png", width: 1200, height: 630, alt: "GGMarket — Buy. Sell. Trade. Upgrade." }] },
};
export const viewport: Viewport = { themeColor: "#07090e", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={geist.variable} data-scroll-behavior="smooth">
    {process.env.NODE_ENV !== "production" ? <head>
      {/* This must run before Next's client assets so it can diagnose their load failures. */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/dev-diagnostics.js" />
    </head> : null}
    <body>
      <Script src="/sw-bootstrap.js" strategy="beforeInteractive" data-environment={process.env.NODE_ENV} />
      <a href="#main-content" className="skip-link">Skip to content</a>
      <NotificationCenter>
        <Header />
        <main id="main-content" className="page-enter">{children}</main>
        <SiteFooter />
        <MobileNav />
      </NotificationCenter>
      <ServiceWorkerRegistration />
    </body>
  </html>;
}
