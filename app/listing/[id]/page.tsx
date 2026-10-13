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
  return (
    <div className="container-page py-5 md:py-10">
      <ListingViewTracker listingId={id} />
      <nav className="mb-5 flex items-center gap-2 text-xs font-medium text-[var(--muted)]" aria-label="Breadcrumb">
        <Link href="/marketplace" className="transition hover:text-white">Marketplace</Link> <span aria-hidden="true">/</span>
        <Link href={`/marketplace?category=${item.category.slug}`}>
          {item.category.name}
        </Link>
      </nav>
      <div className="grid gap-7 lg:grid-cols-[minmax(0,1.28fr)_minmax(320px,.72fr)] lg:gap-9">
        <div className="contents lg:block">
          <div className="order-1 lg:order-none"><ListingGallery images={item.images} title={item.title} /></div>
          <section className="order-3 mt-0 card p-5 sm:p-7 lg:mt-6">
            <h2 className="text-xl font-extrabold tracking-tight">About this item</h2>
            <p className="mt-4 whitespace-pre-line leading-7 text-[var(--text-secondary)]">
              {item.description}
            </p>
            <h2 className="mt-8 text-xl font-bold">Specifications</h2>
            {Object.keys(item.attributes).length ? (
              <dl className="mt-4 grid grid-cols-2 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[#0a0e15]">
                {Object.entries(item.attributes)
                  .filter(([key]) => !key.startsWith("_"))
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="border-b border-[var(--border)] p-3.5 last:border-0 odd:border-r"
                    >
                      <dt className="text-xs capitalize text-[var(--muted)]">
                        {key.replaceAll("_", " ")}
                      </dt>
                      <dd className="mt-1 text-sm font-semibold">
                        {typeof value === "boolean"
                          ? value
                            ? "Yes"
                            : "No"
                          : value}
                      </dd>
                    </div>
                  ))}
              </dl>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">
                No additional specifications provided.
              </p>
            )}
          </section>
        </div>
        <aside className="order-2 lg:order-none">
          <div className="surface-panel p-5 lg:sticky lg:top-20 lg:p-6">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="badge w-fit capitalize">
                  {labelCondition(item.condition)}
                </p>
                <h1 className="mt-3 text-2xl font-[850] leading-tight tracking-[-.04em] sm:text-3xl">
                  {item.title}
                </h1>
              </div>
              <FavoriteButton
                listingId={item.id}
                initialFavorite={isFavorite}
              />
            </div>
            <p className="price mt-5 text-4xl">
              {priceLabel}
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {item.location}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-3.5" />
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <Eye className="size-3.5" />
                {item.views} views
              </span>
            </div>
            <div className="divider my-6" />
            <Link
              href={`/profile/${item.seller.username}`}
              className="flex items-center gap-3 rounded-[var(--radius-md)] border border-transparent p-2 transition hover:border-[var(--border)] hover:bg-[var(--surface-alt)]"
            >
              <span className="grid size-12 place-items-center rounded-full border border-white/10 bg-gradient-to-br from-[#7458e9] to-[#2b739e] font-extrabold shadow-md">
                {item.seller.displayName[0]}
              </span>
              <span>
                <span className="flex items-center gap-1 font-bold">
                  {item.seller.displayName}
                  {item.seller.verified && (
                    <BadgeCheck className="size-4 text-[var(--success)]" />
                  )}
                </span>
                {item.seller.reviewCount > 0 && (
                  <span className="mt-1 flex items-center gap-1 text-xs text-[var(--muted)]">
                    <Star className="size-3 fill-[#f8bf4b] text-[#f8bf4b]" />{" "}
                    {item.seller.rating.toFixed(1)} · {item.seller.reviewCount}{" "}
                    reviews
                  </span>
                )}
              </span>
            </Link>
            <div className="mt-5 space-y-2 text-sm text-[#bec4d0]">
              {item.shipping && (
                <p className="flex items-center gap-2">
                  <PackageCheck className="size-4 text-[var(--success)]" />{" "}
                  Shipping available
                </p>
              )}
              {item.meetup && (
                <p className="flex items-center gap-2">
                  <MapPin className="size-4 text-[var(--success)]" /> Local
                  meetup available
                </p>
              )}
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-[#9c87ff]" /> Verify the
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
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className="inline-flex min-h-11 items-center gap-1 text-sm text-[var(--muted)]">
                <Heart className="size-4" /> {extras.favoriteCount}
              </span>
              <ListingClientTools title={item.title} />
              <ReportButton listingId={item.id} />
            </div>
          </div>
        </aside>
      </div>
      {extras.priceInsight && (
        <section className="mt-10 card p-6 sm:p-7">
          <p className="eyebrow">Price intelligence</p>
          <h2 className="mt-2 text-xl font-bold">
            Current asking-price context
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[#0a0e15] p-3">
              <span className="text-xs text-[var(--muted)]">
                Typical listed range
              </span>
              <strong className="mt-1 block">
                {formatPrice(extras.priceInsight.min)}–
                {formatPrice(extras.priceInsight.max)}
              </strong>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[#0a0e15] p-3">
              <span className="text-xs text-[var(--muted)]">Median asking</span>
              <strong className="mt-1 block">
                {formatPrice(extras.priceInsight.median)}
              </strong>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[#0a0e15] p-3">
              <span className="text-xs text-[var(--muted)]">
                Average asking
              </span>
              <strong className="mt-1 block">
                {formatPrice(extras.priceInsight.average)}
              </strong>
            </div>
            <div className="rounded-xl border border-[var(--border)] bg-[#0a0e15] p-3">
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
      <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-40 flex items-center gap-3 border-t border-white/[.08] bg-[#090c12ed] p-3 shadow-[0_-14px_34px_rgba(0,0,0,.28)] backdrop-blur-2xl md:hidden">
        <strong className="price mr-auto text-xl">
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
