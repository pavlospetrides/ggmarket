import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  Eye,
  Heart,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Star,
} from "lucide-react";
import { FavoriteButton } from "@/components/favorite-button";
import {
  ListingClientTools,
  ListingViewTracker,
} from "@/components/listing-client-tools";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingGrid } from "@/components/listing-grid";
import { MessageSellerButton } from "@/components/message-seller-button";
import { ReportButton } from "@/components/report-button";
import { getUser } from "@/lib/auth";
import { formatPrice, labelCondition } from "@/lib/constants";
import { getFavoriteIds, getListing, getListingExtras } from "@/lib/data";
import { formatTaxonomyAttribute, isDeprecatedTaxonomyAttribute } from "@/lib/gaming-taxonomy";

const LISTING_ATTRIBUTE_ORDER = [
  "product_name", "subcategory", "family", "platform", "model", "compatibility",
  "manufacturer", "series", "exact_model", "socket", "chipset", "vram_gb",
  "capacity_gb", "form_factor", "switch_type", "connection", "dpi", "genre",
  "game_series", "release_year", "multiplayer", "pegi", "game_features",
  "publisher", "edition", "packaging", "manuals", "region", "force_feedback", "pedals_included", "original_box",
  "warranty", "intent", "wanted_budget_min",
] as const;
const listingAttributeRank = new Map<string, number>(LISTING_ATTRIBUTE_ORDER.map((key, index) => [key, index]));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = await getListing(id);
  if (!item) return { title: "Listing unavailable" };
  return {
    title: item.title,
    description: item.description.slice(0, 155),
    openGraph: item.images[0] ? { images: [item.images[0]] } : undefined,
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [item, user] = await Promise.all([getListing(id), getUser()]);
  if (!item) notFound();
  const [isFavorite, extras] = await Promise.all([
    user ? getFavoriteIds(user.id).then((ids) => ids.has(id)) : false,
    getListingExtras(item),
  ]);
  const budgetMin = Number(item.attributes.wanted_budget_min || 0);
  const priceLabel = item.attributes.intent === "wanted" && budgetMin > 0 ? `${formatPrice(budgetMin, item.currency)}–${formatPrice(item.price, item.currency)}` : formatPrice(item.price, item.currency);
  const orderedAttributes = Object.entries(item.attributes)
    .filter(([key]) => !key.startsWith("_") && key !== "taxonomy_version" && !isDeprecatedTaxonomyAttribute(key))
    .sort(([left], [right]) => (listingAttributeRank.get(left) ?? Number.MAX_SAFE_INTEGER) - (listingAttributeRank.get(right) ?? Number.MAX_SAFE_INTEGER) || left.localeCompare(right));
  return (
    <div className="container-page min-w-0 pt-5 pb-40 md:pt-10 md:pb-12">
      <ListingViewTracker listingId={id} />
      <nav className="mb-5 flex min-w-0 flex-wrap items-center gap-2 text-sm font-medium text-[var(--text-secondary)]" aria-label="Breadcrumb">
        <Link href="/marketplace" className="transition hover:text-white">Marketplace</Link> <span aria-hidden="true">/</span>
        <Link href={`/marketplace?category=${item.category.slug}`} className="min-w-0 [overflow-wrap:anywhere] hover:text-white">
          {item.category.name}
        </Link>
      </nav>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.28fr)_minmax(320px,.72fr)] lg:gap-9">
        <div className="contents lg:block lg:min-w-0">
          <div className="order-1 min-w-0 lg:order-none"><ListingGallery images={item.images} title={item.title} /></div>
          <section className="order-3 mt-0 min-w-0 rounded-[var(--radius-xl)] bg-[var(--surface)] p-5 sm:p-7 lg:mt-6">
            <h2 className="text-xl font-extrabold tracking-tight">About this item</h2>
            <p className="mt-4 whitespace-pre-line leading-7 text-[var(--text-secondary)] [overflow-wrap:anywhere]">
              {item.description}
            </p>
            <h2 className="mt-8 text-xl font-bold">Specifications</h2>
            {orderedAttributes.length ? (
              <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-md)] bg-[var(--border)]">
                {orderedAttributes.map(([key, value]) => {
                    const formatted = formatTaxonomyAttribute(key, value);
                    return (
                    <div
                      key={key}
                      className="min-w-0 bg-[var(--surface-alt)] p-4"
                    >
                      <dt className="text-xs text-[var(--text-secondary)] [overflow-wrap:anywhere]">
                        {formatted.label}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold [overflow-wrap:anywhere]">
                        {formatted.value}
                      </dd>
                    </div>
                  ); })}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No additional specifications provided.
              </p>
            )}
          </section>
        </div>
        <aside className="order-2 min-w-0 lg:order-none">
          <div className="min-w-0 rounded-[var(--radius-xl)] bg-[var(--surface)] p-5 lg:sticky lg:top-20 lg:p-6">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="badge w-fit capitalize">
                  {labelCondition(item.condition)}
                </p>
                <h1 className="mt-3 text-[clamp(2.25rem,4vw,3rem)] font-[850] leading-[1.05] tracking-[-.04em] [overflow-wrap:anywhere]">
                  {item.title}
                </h1>
              </div>
              <FavoriteButton
                listingId={item.id}
                initialFavorite={isFavorite}
                className="shrink-0"
              />
            </div>
            <p className="price mt-5 text-[clamp(2rem,4vw,2.5rem)] tabular-nums [overflow-wrap:anywhere]">
              {priceLabel}
            </p>
            <div className="mt-4 flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--text-secondary)]">
              <span className="inline-flex min-w-0 items-start gap-1">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 [overflow-wrap:anywhere]">{item.location}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5 shrink-0" aria-hidden="true" />
                {item.views} views
              </span>
            </div>
            <div className="divider my-6" />
            <Link
              href={`/profile/${item.seller.username}`}
              className="flex min-w-0 items-center gap-3 rounded-[var(--radius-md)] p-2 transition-colors hover:bg-[var(--surface-alt)]"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[var(--surface-elevated)] font-extrabold text-[var(--primary-hover)]" aria-hidden="true">
                {item.seller.displayName[0] || "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-start gap-1.5 font-bold">
                  <span className="min-w-0 [overflow-wrap:anywhere]">{item.seller.displayName}</span>
                  {item.seller.verified && (
                    <BadgeCheck className="mt-1 size-4 shrink-0 text-[var(--success)]" aria-label="Verified seller" />
                  )}
                </span>
                {item.seller.reviewCount > 0 && (
                  <span className="mt-1 flex flex-wrap items-center gap-1 text-xs text-[var(--text-secondary)]">
                    <Star className="size-3 shrink-0 fill-[#f8bf4b] text-[#f8bf4b]" aria-hidden="true" />{" "}
                    {item.seller.rating.toFixed(1)} · {item.seller.reviewCount}{" "}
                    reviews
                  </span>
                )}
              </span>
            </Link>
            <div className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
              {item.shipping && (
                <p className="flex items-center gap-2">
                  <PackageCheck className="size-4 shrink-0 text-[var(--success)]" aria-hidden="true" />{" "}
                  Shipping available
                </p>
              )}
              {item.meetup && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-[var(--success)]" aria-hidden="true" /> Local
                  meetup available
                </p>
              )}
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0 text-[var(--primary-hover)]" aria-hidden="true" /> Verify the
                item before paying
              </p>
            </div>
            {user?.id === item.seller.id ? (
              <Link
                href={`/listing/${item.id}/edit`}
                className="btn-secondary mt-6 w-full"
              >
                Manage listing
              </Link>
            ) : (
              <MessageSellerButton
                listingId={item.id}
                loggedIn={Boolean(user)}
                label={
                  item.attributes.intent === "wanted"
                    ? "I have one"
                    : "Message seller"
                }
              />
            )}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <span className="inline-flex min-h-11 items-center gap-1 text-sm tabular-nums text-[var(--text-secondary)]" aria-label={`${extras.favoriteCount} favorites`}>
                <Heart className="size-4 shrink-0" aria-hidden="true" /> {extras.favoriteCount}
              </span>
              <ListingClientTools title={item.title} />
              <ReportButton listingId={item.id} />
            </div>
          </div>
        </aside>
      </div>
      {extras.priceInsight && (
        <section className="mt-10 min-w-0 rounded-[var(--radius-xl)] bg-[var(--surface)] p-5 sm:p-7">
          <h2 className="text-xl font-bold">
            Price intelligence & asking-price context
          </h2>
          <div className="mt-5 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 sm:grid-cols-4 [&>div]:min-w-0 [&_strong]:tabular-nums [&_strong]:[overflow-wrap:anywhere]">
            <div className="rounded-xl bg-[var(--surface-alt)] p-4">
              <span className="text-xs text-[var(--muted)]">
                Typical listed range
              </span>
              <strong className="mt-1 block">
                {formatPrice(extras.priceInsight.min)}–
                {formatPrice(extras.priceInsight.max)}
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--surface-alt)] p-4">
              <span className="text-xs text-[var(--muted)]">Median asking</span>
              <strong className="mt-1 block">
                {formatPrice(extras.priceInsight.median)}
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--surface-alt)] p-4">
              <span className="text-xs text-[var(--muted)]">
                Average asking
              </span>
              <strong className="mt-1 block">
                {formatPrice(extras.priceInsight.average)}
              </strong>
            </div>
            <div className="rounded-xl bg-[var(--surface-alt)] p-4">
              <span className="text-xs text-[var(--muted)]">Available</span>
              <strong className="mt-1 block">
                {extras.priceInsight.available}
              </strong>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Active asking prices, not completed sales. Shown only with at least
            three comparable listings.
          </p>
        </section>
      )}
      {extras.other.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title">More from this seller</h2>
          <div className="mt-5">
            <ListingGrid listings={extras.other} />
          </div>
        </section>
      )}
      {extras.similar.length > 0 && (
        <section className="mt-12">
          <h2 className="section-title">Similar listings</h2>
          <div className="mt-5">
            <ListingGrid listings={extras.similar} />
          </div>
        </section>
      )}
      <div data-listing-actions="mobile" className="fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom))] z-40 flex flex-wrap items-center gap-3 border-t border-[var(--border)] bg-[var(--surface)] px-[max(1rem,env(safe-area-inset-left))] py-3 pr-[max(1rem,env(safe-area-inset-right))] shadow-[0_-8px_24px_rgba(0,0,0,.2)] md:hidden"> {/* taste-skill-ignore: fixed mobile action bar is a real overlay */}
        <strong className="price min-w-0 flex-1 basis-28 text-xl tabular-nums [overflow-wrap:anywhere]">
          {priceLabel}
        </strong>
        {user?.id !== item.seller.id && (
          <MessageSellerButton
            listingId={item.id}
            loggedIn={Boolean(user)}
            compact
            label={
              item.attributes.intent === "wanted" ? "I have one" : "Message"
            }
          />
        )}
      </div>
    </div>
  );
}
