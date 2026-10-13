import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import { MobileNav } from "@/components/mobile-nav";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "GGMarket — The marketplace for gamers", template: "%s | GGMarket" },
  description: "Buy and sell gaming hardware, games, and gear with gamers near you.",
  openGraph: { title: "GGMarket", description: "Buy. Sell. Trade. Upgrade.", type: "website" },
};
export const viewport: Viewport = { themeColor: "#07090e", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body><a href="#main-content" className="skip-link">Skip to content</a><Header /><main id="main-content" className="page-enter">{children}</main><MobileNav /><ServiceWorkerRegistration /></body></html>;
}
