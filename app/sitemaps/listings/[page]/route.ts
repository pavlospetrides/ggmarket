import { getPublicListingSitemapRows } from "@/lib/sitemap-data";
import { buildPublicListingEntries, parseSitemapPage, renderUrlSet } from "@/lib/sitemap-public";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ page: string }> },
) {
  const page = parseSitemapPage((await params).page);
  if (!page) return new Response("Not found", { status: 404 });
  const entries = buildPublicListingEntries(await getPublicListingSitemapRows(page));
  if (!entries.length) return new Response("Not found", { status: 404 });
  return new Response(renderUrlSet(entries), {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
