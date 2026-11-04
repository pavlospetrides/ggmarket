# Favorites Desktop and iPhone Scroll Stability Audit

Date: 2026-11-04

## Executive recommendation

**GO for code review and staging. NO-GO for production acceptance until the physical-iPhone checklist below passes in both Chrome and Safari.** The confirmed application-driven scroll feedback loop is fixed and covered in Chromium and WebKit, but desktop WebKit emulation cannot reproduce iPhone browser-toolbar dynamics or prove the original field report is resolved on hardware.

## Task A — Favorites desktop

### Confirmed root cause

The rail capped cards at 168px and calculated fit by dividing the measured stage width across every item in the active eight-item batch before deciding whether carousel mode was necessary. At 1366px, an eight-item batch therefore produced cards around 137px. Five cards still stopped at the 168px cap, leaving substantial unused space. This was geometry behavior, not a CSS presentation problem.

### Implemented sizing model

`favoriteRailResponsiveSize()` now makes one measured decision for card size, rail/carousel mode, and compact/full lanyards:

| Viewport/fixture | Stage width | Card width | Mode |
| --- | ---: | ---: | --- |
| 320px / 5 | 288px | 138px | compact carousel |
| 390px / 5 | 358px | 154px | compact carousel |
| 768px / 2 | 720px | 176px | rail |
| 1024px / 5 | 992px | 210px | full-height carousel |
| 1366px / 5 | 1334px | 210.5px | rail |
| 1366px / 8 | 1334px | 240px | full-height carousel |
| 1440px / 5 | 1408px | 230.5px | full-height carousel |
| 1920px / 5 | 1760px | 260px | rail |

The existing mobile formula below 640px is unchanged. If the minimum readable desktop width will not fit at a collision-safe pitch, the cards remain large and the component becomes a bounded carousel. Desktop carousel controls are keyboard-accessible 44px buttons. Collections remain paged in batches of eight, so 30 items are all reachable while physics work stays bounded.

All downstream geometry continues to derive from card width: image and type scale, stage height, full/compact straps, attachment points, hit testing, drag bounds, collision targets, pull limits, and shadows. No whole-component CSS scale was introduced.

### Evidence

- Before, 1366px: [desktop-1366.png](../../artifacts/favorites-desktop-ios-scroll/before/desktop-1366.png)
- After, 1366px / five: [desktop-1366-five.png](../../artifacts/favorites-desktop-ios-scroll/after/desktop-1366-five.png)
- After, 1440px / eight: [desktop-1440-eight.png](../../artifacts/favorites-desktop-ios-scroll/after/desktop-1440-eight.png)
- After, 768px / eight: [tablet-768-eight.png](../../artifacts/favorites-desktop-ios-scroll/after/tablet-768-eight.png)
- Before mobile: [mobile-390.png](../../artifacts/favorites-desktop-ios-scroll/before/mobile-390.png)
- After mobile: [mobile-390-five.png](../../artifacts/favorites-desktop-ios-scroll/after/mobile-390-five.png)

Automated coverage verifies 320, 360, 375, 390, 414, 430, 768, 1024, 1280, 1366, 1440, and 1920px; five/eight/30-item fixtures; no document overflow; mobile-nav clearance; carousel navigation; flip/removal; reduced motion; pull/spring behavior; and collision-safe targets.

The design/taste lint produced no component-level failures or warnings. Page-level inspector findings were existing GGMarket brand purple, existing masthead microcopy, test-harness SVG fixtures, and absence of decorative video; none is a defect in this application component. The current `main` branch exposes no light-theme implementation to exercise, so runtime light-mode acceptance remains unavailable; the rail retains self-contained, explicit high-contrast surface colors.

## Task B — iPhone scrolling

### Reproduction and confirmed evidence

The physical iPhone symptom was not reproduced on hardware because no iPhone was available. The underlying application-induced behavior was reproduced deterministically in the navigation harness:

1. Navigate from a results source to a listing and then back with a saved scroll snapshot.
2. Leave a document image incomplete so the old restorer remains active.
3. Begin a user wheel/touch-like scroll while restoration is pending.
4. The old implementation continues issuing `scrollBy()` corrections after user intent.

Instrumentation counted **21 additional application `scrollBy()` calls across the next 12 animation frames** after the user gesture. This is distinct from native iOS rubber-banding and is strong evidence for a scroll-restoration/native-momentum conflict.

The affected architecture is global: `BrowsingStateRestorer` is mounted for Home, Browse, Marketplace, Search/Listing flows, Favorites, Profile, saved/recent pages, and related navigation routes. The previous implementation polled on every animation frame for up to 180 frames while any image was incomplete, and could be rescheduled by body resize and subtree mutation. It therefore had the exact shape of an intermittent feedback loop that depends on navigation timing and image/layout completion.

### Implemented fix

The restorer is now a bounded, event-driven restoration session:

- apply the saved snapshot immediately;
- retry only on relevant body resize, child-list mutation, pending image load/error, or font readiness;
- stop immediately on `pointerdown`, `touchstart`, `wheel`, or a scroll/navigation key;
- use one idempotent cleanup path for RAF, timeout, observers, image listeners, and user-intent listeners;
- end unconditionally after 2.5 seconds.

The fix preserves exact Smart Back anchor/rail restoration and does not add smooth scrolling, a global scroll lock, global `preventDefault()`, or `touch-action: none`.

### Favorites gesture hardening

The rail was not established as the global root cause, but two concrete risks were corrected:

- Touch gestures now remain pending until intent is clear. A quick vertical movement is handed to native page scrolling; a deliberate pull requires a 180ms hold; a clear horizontal movement becomes a carousel swipe.
- `pointercancel` now aborts the full transient state: pending toggle, pull, drag, swipe, velocity/free-drag state, and capture. Pointer capture failure (including WebKit invalidation between classification and capture) fails closed without an uncaught `NotFoundError`.

Mouse drag/pull, touch pull, horizontal swipe, card flip, and reduced-motion controls remain functional.

### Confirmed versus hypothetical

Confirmed:

- The old restorer continued programmatic corrections after new user intent.
- The new restorer produces no post-intent corrections in Chromium or WebKit tests.
- Quick vertical touch over a card remains native and uncaptured.
- Cancellation cleans up interaction state; invalidated WebKit capture no longer throws.
- Repeated scrolling on Home, Marketplace, and Browse stays within the existing layout/overflow/performance thresholds.

Not confirmed on physical hardware:

- Chrome/Safari address-bar hide/show behavior.
- Whether the field report had any additional WebKit rendering or device-only trigger.
- Native rubber-band feel, browser zoom, and real touch latency.

No evidence supported replacing viewport units globally, disabling scroll anchoring, suppressing native overscroll, or removing lanyard physics, so those speculative workarounds were not applied.

## Verification executed

| Check | Result |
| --- | --- |
| `npm run typecheck` | pass |
| `npm run lint` | pass |
| `npm test` | 68 files, 485 tests pass |
| Favorites Playwright, Chromium mobile + WebKit | 82 unrelated cases pass in the combined run; corrected synthetic-capture swipe case passes 2/2 when rerun |
| Listing navigation, Chromium + desktop WebKit | 28/28 pass |
| Public mobile scrolling/performance, Chromium mobile + WebKit | 6/6 pass |
| Production `next build` | pass, Next.js 16.4.3 |
| Production `next start` smoke | `/`, `/marketplace`, `/browse`, Favorites fixture all HTTP 200; 8-card carousel rendered |
| Responsive screenshots | visually inspected at desktop, tablet, and mobile breakpoints |
| `git diff --check` | pass |

Upstream signed fixture images occasionally timed out during development-browser runs, but the affected tests passed and production routes returned 200. No database, RLS, authentication, CSP, or Supabase mutation code was changed.

## Physical iPhone acceptance checklist

Run on both current iPhone Chrome and Safari, preferably once on Wi-Fi and once on a slower connection:

1. Slowly scroll up/down on Home, Browse, Marketplace, Listing Detail, Favorites, and Profile.
2. Perform aggressive flicks and rapid direction reversals in the middle and at both page boundaries.
3. Start a vertical flick directly over a Favorites card and in the empty rail area; confirm native momentum settles.
4. Swipe the carousel horizontally, then immediately scroll vertically; alternate directions rapidly.
5. Pull/release a card, flip it, and immediately scroll; confirm the page does not self-scroll.
6. Navigate results → listing → Smart Back while images are still loading, then immediately flick; confirm restoration yields to the gesture.
7. Repeat while the address bar hides and reappears, in portrait and landscape.
8. Exercise browser zoom, bottom safe-area clearance, expanded card actions, Escape/back behavior, and remove/view actions.
9. Leave each page idle after a flick for at least five seconds; any repeated movement after native bounce is a failure.

Record the route, scroll direction, starting element, network condition, orientation, and a screen recording for any recurrence.

## Files changed

- `lib/favorite-rail.ts` — responsive sizing and gesture-intent helpers.
- `components/ui/favorite-lanyard-rail.tsx` — geometry integration, desktop controls, cancellation/capture lifecycle.
- `components/listing-navigation.tsx` — event-driven, user-cancellable restoration.
- `app/test-harness/favorites/page.tsx` — deterministic item-count fixtures.
- `tests/favorite-lanyard-physics.test.ts` — sizing, collision, and gesture unit coverage.
- `tests/e2e/favorites-safe.spec.ts` — responsive, collection, gesture, cancellation, pull, and reduced-motion coverage.
- `tests/e2e/listing-navigation.spec.ts` — post-intent scroll-correction regression.
- `artifacts/favorites-desktop-ios-scroll/` — before/after evidence.
- Design, implementation-plan, and this audit document.
