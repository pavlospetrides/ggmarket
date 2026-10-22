# GGMarket mobile performance optimization

Date: 2026-10-22
Target: Next.js 16 production build, with emphasis on iPhone Safari
Production origin: `https://ggmarket-sage.vercel.app`

## Scope and measurement method

The baseline was captured before the performance changes from a representative local `next build` / `next start` build. Lighthouse 12.8.2 used a 390×844, DPR 3 mobile screen with simulated throttling. The same local production workflow was used after the changes. Raw Lighthouse JSON stayed in the operating-system temporary directory because it contains transient request URLs and is not a repository artifact.

These are single-run lab results, not Chrome UX Report data and not physical-iPhone measurements. The before run included a colder server response than the after run, so paint-time changes must not be treated as field improvement percentages. JavaScript transfer, main-thread work, request topology, browser behavior and the regression suite are the more useful comparative evidence. INP at the 75th percentile cannot be established without field telemetry. No new tracking was added.

The installed Next.js 16 documentation was reviewed for Server/Client Components, navigation and prefetching, image loading, lazy loading, package analysis and web vitals. `next experimental-analyze --output` and Lighthouse unused-JavaScript/network audits were used to inspect the module and request graph.

## Initial bottlenecks

1. **Supabase browser Auth and Realtime were in the global initial client graph.** `NotificationCenter` statically imported the Supabase browser client and initialized Auth even for anonymous visitors. Lighthouse showed a roughly 66.6 KB script with about 55.2 KB unused on public routes, and anonymous pages could initialize infrastructure they did not need.
2. **Private listing images caused an N-request signing fan-out.** `enrichRows` called `createSignedUrl` once for every unique image. A 24-card page could therefore add many serializable Storage API operations before rendering, despite Supabase supporting a batch signing endpoint.
3. **The Browse LCP image was discovered late.** Lighthouse identified `/images/browse/browse-fresh-drops.webp` as the LCP element and reported about 2.7 seconds of load delay in the baseline. The initial-document discovery check failed.
4. **Mobile visual layers used costly live filters.** The home hero used large blurred ambient layers, while the Chat composer and notification panel used backdrop filters over changing content. These are repaint/compositing risks on memory-constrained iPhones, especially while messages or the page move behind them.
5. **A presentational category board was unnecessarily hydrated.** `CategorySwitchboard` was a Client Component only to update CSS spotlight coordinates from pointer/focus layout reads. Mobile touch did not use the pointer behavior, but both board instances still carried client code and hydration work.

The marketplace also retains a sizeable interactive client boundary for URL-backed filters and its Radix sheet. It was not split merely to improve a bundle number because the filter trigger must remain immediately usable on iPhone. Virtualization was not introduced: the existing initial page is already limited and the measured DOM did not justify the accessibility and interaction cost.

## Implemented changes

- `NotificationCenter` now obtains the authenticated account scope from the private, no-store notification API. It dynamically loads the Supabase browser client and creates the account-scoped Realtime channel only for an authenticated user. Anonymous public pages do not open Realtime. Login and immediately confirmed signup dispatch a local auth-change event so the global provider activates without a reload. Generation checks, account switching, channel cleanup and user-id reconciliation remain in place.
- The notification API now includes `userId` (`null` when anonymous). This allows the client to reject a response from the wrong account generation without exposing additional profile data or changing cache policy.
- Listing image URLs use one `createSignedUrls(imagePaths, 3600)` request per enrichment batch instead of one Storage request per image. Private signed URLs, expiration and RLS behavior are unchanged.
- The Browse hero uses Next.js 16 `preload` for its single above-the-fold LCP image. The post-change Lighthouse audit reports that the responsive image is discoverable in the initial document and is not lazy-loaded.
- `CategorySwitchboard` is now a Server Component. Its CSS hover/focus treatment remains, without pointer-driven layout reads.
- The mobile hero’s blurred elements were replaced with equivalent radial-gradient fades. The Chat composer and notification panel now use opaque surfaces instead of backdrop filters. Safe-area and viewport-owned Chat layout behavior are unchanged.
- Added regression coverage for batch signing, anonymous notification scope, lazy Supabase loading, LCP preloading, anonymous Realtime avoidance, mobile scroll stability, horizontal overflow, long tasks and CLS.

## Before and after lab results

| Route | Perf score | FCP (ms) | LCP (ms) | TBT (ms) | CLS | JS transfer | Main-thread work (ms) | Long tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home — before | 91 | 2046.7 | 2951.5 | 18.5 | 0 | 237,402 B | 889.5 | 2 |
| Home — after | 100 | 470.5 | 595.2 | 0 | 0 | 159,559 B | 202.5 | 0 |
| Marketplace — before | 90 | 910.9 | 3694.3 | 30.0 | 0 | 272,490 B | 877.3 | 2 |
| Marketplace — after | 100 | 252.6 | 724.0 | 0 | 0 | 204,960 B | 205.8 | 0 |
| Browse — before | 89 | 911.4 | 3847.7 | 14.5 | 0 | 225,888 B | 977.5 | 3 |
| Browse — after | 100 | 259.0 | 807.5 | 0 | 0 | 158,625 B | 241.3 | 0 |

Public-route JavaScript fell by 77,843 B (32.8%) on Home, 67,530 B (24.8%) on Marketplace and 67,263 B (29.8%) on Browse. Measured main-thread work fell by 75–77% in these runs. Those two changes align with removing Supabase from the anonymous initial graph and removing the category board client boundary.

Total transfer was 464,070 → 458,795 B on Home and 466,508 → 445,820 B on Marketplace. Browse was 557,265 → 641,908 B. The Browse increase is the cost observed when the responsive LCP artwork was intentionally fetched from the initial document instead of being discovered late; its source asset is 86,878 B at 1920×900, while the browser selects a DPR-appropriate optimized candidate. The image itself was not recompressed in this task because visual review on a physical Retina iPhone is required before selecting a lower quality. The LCP resource load duration was small; discovery/load delay was the measured issue addressed.

The large LCP/FCP deltas are reported for transparency but are not claimed as field gains because the local before/after server warmth differed. CLS stayed at zero. Automated Chromium scroll samples at 375, 390 and 430 px found no task over the deliberately generous 500 ms regression ceiling; the final Lighthouse runs found no long tasks. This does not establish a device FPS value.

## Request and rendering impact

- Anonymous visits retain one private, no-store notification bootstrap request, but eliminate Supabase Auth initialization and the Realtime WebSocket. The API is the trusted account boundary; no identity is inferred in the browser.
- An authenticated page still creates exactly the existing user-filtered notification channel and reconciles after subscription. Browser tests cover reconnection, duplicate processing and account-switch isolation.
- Listing image signing changes from **N Storage signing requests to 1 batch request** per listing enrichment call. No public caching or public bucket URL was introduced.
- The Browse LCP request is present in initial-document preload metadata. Below-the-fold listing images keep Next.js lazy-loading behavior and their existing responsive `sizes` declarations.
- Live `filter: blur()` / `backdrop-filter` work was removed from the highest-risk mobile surfaces without adding permanent `will-change` layers. Existing `prefers-reduced-motion` handling remains.

## Regression evidence

Final focused browser runs used the local production build and mock/test-harness routes only; they did not create production users or mutate production Supabase data.

- Chromium + Playwright WebKit: 58 passed, 4 data-dependent skips across Home, Browse, Marketplace filters, listing actions, notifications, Chat and Sell/Edit harnesses.
- Favorites: 11 passed, 1 no-hydration project-specific skip in Chromium; 11 passed, 1 skip in WebKit. Coverage includes 320, 375, 390, 393 and 430 px, rapid taps, optimistic rollback and late cross-account responses.
- Performance regression spec: 6 passed across Chromium and WebKit. It covers 375×667, 390×844 and 430×932, repeated scrolls on Home/Marketplace/Browse, CLS, horizontal overflow, LCP preload presence and anonymous Realtime avoidance.
- Focused Vitest during implementation: notification API/state/contracts and image-signing contracts passed.
- Final repository gates are recorded in the branch handoff: TypeScript, ESLint, full Vitest and production build.

The automated WebKit engine is the closest available Safari signal, but it is not a native physical iPhone profile. WebKit mobile mode does not support Playwright mouse-wheel input, so its performance regression uses repeated programmatic viewport scrolling; the wider WebKit suite supplies real taps, text input, filter interactions, message sends and navigation. Gallery switching was skipped where the read-only data set did not expose a multi-image listing.

## Remaining bottlenecks and follow-ups

- Marketplace’s interactive filter component and Radix dialog code remain a meaningful route bundle. A future split should be accepted only after measuring first-tap latency on a physical iPhone; deferring it blindly could make the primary mobile filter control feel worse.
- The Browse hero increases early image bytes at DPR 3. Evaluate quality 65–70 and perceptual differences on Retina hardware before changing `next.config` image qualities.
- Private signed image URLs are intentionally short lived and cannot safely use public immutable caching. A separate upload pipeline could validate dimensions, strip metadata and generate private thumbnail derivatives, but existing production media should not be rewritten silently.
- Field p75 LCP/INP and real scroll-frame data require privacy-reviewed production RUM or an owner-run Safari profile. React render counts were not treated as a bottleneck without a representative authenticated React Profiler capture.
- Profile editing was not run against the configured Supabase project because the available safe harness does not cover that workflow and the test policy prohibits mutating a potentially shared project. Existing authorization/RLS code was not changed.

## Physical iPhone validation checklist

1. On an iPhone, open Safari’s Web Inspector from a trusted Mac and enable a fresh Network/Timelines recording.
2. Test once on a cold cache and once on a warm cache at `https://ggmarket-sage.vercel.app`; note the device model, iOS version and connection type.
3. Scroll Home, Marketplace and Browse continuously. Confirm no hitch when the bottom navigation is visible and when listing images enter the viewport.
4. Tap Home → Marketplace → listing → seller profile, use Back, open/close filters, type a search and change sorting. Confirm the first tap is acknowledged immediately.
5. Sign in with a dedicated test account. Verify Favorites, Profile → Edit Profile, Messages → conversation, send/receive, Notifications and every Sell Wizard step.
6. In a long conversation, open and close the iPhone keyboard. Confirm the composer and Send button remain visible and only message history scrolls.
7. In Web Inspector, confirm anonymous pages do not open `/realtime/v1`, authenticated use has one notification channel, no hydration errors appear, and no repeating long task aligns with ordinary scrolling.
8. Record field-like LCP and interaction latency over several runs. Do not compare one warm run to one cold run, and do not infer p75 INP from a single interaction.

## Files changed

- `app/api/notifications/route.ts`
- `app/browse/page.tsx`
- `app/globals.css`
- `components/auth-form.tsx`
- `components/category-switchboard.tsx`
- `components/chat-interface.tsx`
- `components/notification-bell.tsx`
- `components/notification-center.tsx`
- `lib/data.ts`
- `tests/data-image-signing-contract.test.ts`
- `tests/e2e/performance-safe.spec.ts`
- `tests/notification-api.test.ts`
