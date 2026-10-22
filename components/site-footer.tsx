import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { Logo } from "@/components/logo";

export function SiteFooter() {
  return <footer data-site-footer className="home-footer" aria-label="Site footer">
    <div className="container-page">
      <div className="footer-mark" aria-hidden="true">
        <BrandMark className="footer-symbol" />
        <span className="footer-wordmark">GGMarket</span>
      </div>
      <div className="footer-links">
        <Logo />
        <nav aria-label="Footer navigation">
          <Link href="/marketplace">Marketplace</Link>
          <Link href="/browse">Browse</Link>
          <Link href="/sell">Sell</Link>
          <Link href="/cookies">Cookie policy</Link>
          <Link href="/privacy">Privacy policy</Link>
        </nav>
        <p>Buy, sell, and trade gaming gear player to player. Essential storage only; no advertising trackers.</p>
      </div>
    </div>
  </footer>;
}
