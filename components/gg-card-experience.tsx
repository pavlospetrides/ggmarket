"use client";

import LanyardBadge from "@/components/ui/lanyard-badge";
import { getGGCardTheme, type GGCardConfig } from "@/lib/gg-card";

export default function GGCardExperience({ card, displayName, username }: {
  card: GGCardConfig;
  displayName: string;
  username: string;
}) {
  const theme = getGGCardTheme(card.themeId);
  return (
    <div className="overflow-hidden rounded-2xl bg-[#0b0e15]">
      <LanyardBadge
        title="GGMarket"
        subtitle={card.slogan}
        name={displayName}
        role={`@${username}`}
        strapText="GGMarket"
        strapLabel="PLAY · TRADE · BELONG"
        strapColor={theme.strapColor}
        inkColor={theme.inkColor}
        cardColor={theme.cardColor}
        cardWidth={220}
        height="min(68svh, 620px)"
      />
    </div>
  );
}
