"use client";

import LanyardBadge from "@/components/ui/lanyard-badge";
import { getGGCardTheme, type GGCardConfig } from "@/lib/gg-card";

export default function GGCardExperience({ card, displayName, username, height = "min(68svh, 620px)" }: {
  card: GGCardConfig;
  displayName: string;
  username: string;
  height?: string;
}) {
  const theme = getGGCardTheme(card.themeId);
  return (
    <div className="overflow-hidden rounded-2xl bg-[#0b0e15]">
      <LanyardBadge
        title="Lootriva"
        subtitle={card.slogan}
        name={displayName}
        role={`@${username}`}
        strapText="Lootriva"
        strapLabel="PLAY · TRADE · BELONG"
        strapColor={theme.strapColor}
        inkColor={theme.inkColor}
        textColor={card.textColor}
        frontPatternColor={card.frontPatternColor}
        cardColor={theme.cardColor}
        flipButtonPosition="top-left"
        cardWidth={220}
        height={height}
      />
    </div>
  );
}
