import { getPublicSitemapCounts } from "@/lib/sitemap-data";
import { buildSitemapIndexUrls, renderSitemapIndex } from "@/lib/sitemap-public";

export const dynamic = "force-dynamic";

export async function GET() {
  const counts = await getPublicSitemapCounts();
  return new Response(renderSitemapIndex(buildSitemapIndexUrls(counts)), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
