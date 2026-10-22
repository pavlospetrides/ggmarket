import Link from "next/link";
import { ArrowUpRight, Cpu, Disc3, Gamepad2, Headphones } from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  { label: "Consoles", note: "PlayStation, Xbox, Nintendo", href: "/marketplace?category=consoles", Icon: Gamepad2, tone: "violet" },
  { label: "PC hardware", note: "Components and complete builds", href: "/marketplace?category=pc-components", Icon: Cpu, tone: "ink" },
  { label: "Video games", note: "New releases and classics", href: "/marketplace?category=games", Icon: Disc3, tone: "blue" },
  { label: "Accessories", note: "Audio, input and setup gear", href: "/marketplace?category=peripherals", Icon: Headphones, tone: "slate" },
] as const;

export function CategorySwitchboard({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn("category-switchboard", compact && "category-switchboard-compact")}
      aria-label="Explore gaming categories"
      data-testid={compact ? "mobile-category-switchboard" : "category-switchboard"}
    >
      <div className="category-switchboard-intro">
        <p>Choose your lane</p>
        <span>Four routes. One player-to-player exchange.</span>
      </div>
      <nav className="category-switchboard-grid" aria-label="Explore gaming categories">
        {categories.map(({ label, note, href, Icon, tone }) => (
          <Link key={href} href={href} className={`category-switchboard-card category-switchboard-${tone}`}>
            <span className="category-switchboard-visual" aria-hidden="true"><Icon /></span>
            <span className="category-switchboard-copy"><strong>{label}</strong><span>{note}</span></span>
            <ArrowUpRight className="category-switchboard-arrow" aria-hidden="true" />
          </Link>
        ))}
      </nav>
      <span className="category-switchboard-spotlight" aria-hidden="true" />
    </div>
  );
}
