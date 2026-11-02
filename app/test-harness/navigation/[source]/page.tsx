import { notFound } from "next/navigation";
import { NavigationRestorationHarness } from "@/components/navigation-restoration-harness";

export const dynamic = "force-dynamic";

const sources = new Set([
  "marketplace",
  "browse",
  "search",
  "favorites",
  "profile",
  "saved-searches",
  "recently-viewed",
]);

function textParam(params: Record<string, string | string[] | undefined>, key: string, fallback: string) {
  return typeof params[key] === "string" ? params[key] : fallback;
}

export default async function NavigationSourceHarness({
  params,
  searchParams,
}: {
  params: Promise<{ source: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (process.env.NODE_ENV === "production" && process.env.E2E_UI_HARNESS !== "1") notFound();
  const [{ source }, query] = await Promise.all([params, searchParams]);
  if (!sources.has(source)) notFound();

  await new Promise<void>((resolve) => setImmediate(resolve));
  const rawCategory = textParam(query, "category", "all");
  const categoryLabel = rawCategory === "gaming-pcs"
    ? "Gaming PCs"
    : rawCategory.replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const state = [
    `Query ${textParam(query, "q", "none")}`,
    `Category ${categoryLabel}`,
    `Condition ${textParam(query, "condition", "any").replace(/^\w/, (letter) => letter.toUpperCase())}`,
    `Maximum €${textParam(query, "max", "any")}`,
    `Sort ${textParam(query, "sort", "newest") === "price-asc" ? "Price low to high" : textParam(query, "sort", "newest")}`,
    `Page ${textParam(query, "page", "1")}`,
    `Auth ${textParam(query, "auth", "anonymous")}`,
  ].join(" · ");

  return (
    <NavigationRestorationHarness
      source={source}
      listingIds={Array.from({ length: 60 }, (_, index) => index + 1)}
      browsingState={state}
    />
  );
}
