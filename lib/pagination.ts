import type { ListingQuery } from "./types";

export function normalizeListingPage(
  requested: string | string[] | undefined,
  total: number,
  pageSize: number,
) {
  const raw = Array.isArray(requested) ? requested[0] : requested;
  const parsed = Number.parseInt(raw ?? "1", 10);
  const requestedPage = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(requestedPage, lastPage);
}

export function pageHref(path: string, params: ListingQuery, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "page" || !value) continue;
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}
