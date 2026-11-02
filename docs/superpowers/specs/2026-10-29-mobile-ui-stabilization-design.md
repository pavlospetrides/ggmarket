# GGMarket Mobile UI Stabilization Design

## Intent

Stabilize GGMarket's public and account-facing mobile layouts so persistent navigation, listing contact actions, marketplace controls, content, and the footer remain usable on modern iPhone and Android viewports. The work preserves the existing midnight-exchange design system, App Router architecture, Supabase authorization, and navigation-performance improvements.

## Confirmed baseline findings

- Mobile navigation geometry is duplicated as unrelated magic numbers: the rendered bar is about 61px without an inset, while document clearance and listing-action offsets use 78px. Safe-area padding is added independently. This makes the stack dependent on browser mode and toolbar state.
- Listing detail renders the asking price and Message Seller action in the in-flow product panel and again in the fixed mobile action bar. The duplicate bar competes with the product title and navigation in the first viewport.
- The listing page combines a large fixed-stack reserve (`pb-40`) with global body clearance. This prevents the last section from being unreachable but creates excess space and does not model the actual stack.
- The mobile marketplace result toolbar compresses result count, Filters, and Sort into one row at common iPhone widths. At narrow widths the count loses useful space and the controls dominate the row.
- Category navigation intentionally scrolls horizontally, but its sizing and scroll affordance do not consistently communicate that behavior at the narrowest widths.
- Global horizontal overflow is suppressed on `body`; route-level tests must still detect the element that caused overflow rather than treating clipping as a successful layout.
- Local data-backed route coverage is limited because this worktree has no `.env.local`. Existing UI harnesses cover marketplace controls, but listing fixed-stack geometry has no deterministic harness and current live-data listing tests can skip.

## Design decisions

- Define one shared CSS model for mobile navigation content height, safe-area contribution, total navigation height, contextual action height, and spacing. Navigation, body clearance, scroll padding, toasts, and listing actions consume these tokens.
- Keep the five-destination mobile navigation fixed and safe-area aware. Do not add another navigation implementation.
- Keep one mobile listing contact action above navigation. The in-flow panel owns the canonical price; desktop retains its in-flow contact action. Mobile does not repeat either control.
- Reserve only the measured contextual-action height on listing pages. Global body clearance remains responsible for navigation and footer reachability.
- Recompose the marketplace result toolbar as a count row plus a two-column Filters/Sort control row on phones; progressively collapse to the current compact desktop toolbar.
- Keep category navigation horizontally scrollable, thumb-sized, snap-aligned, and visibly partial at the edge where more items exist. Do not allow page-level horizontal scrolling.
- Add deterministic, read-only browser harness coverage for shared fixed-stack geometry. No production Supabase data is created or changed.
- Preserve the dark graphite surfaces, purple primary action, cyan discovery accent, existing typography, current card treatment, and navigation prefetch choices.

## Verification contract

- Required widths: 320, 360, 375, 390, 414, 430, 768, plus representative desktop widths already covered by the responsive suite.
- Chromium and WebKit must assert no page-level horizontal overflow, no intersection between mobile navigation and contextual actions, reachable footer content, visible controls, and at least 44px touch targets.
- Authenticated routes may be verified as safe redirects when no isolated authenticated environment is available. Mutation suites remain blocked without explicit isolated Supabase credentials.
- Final gates: TypeScript, ESLint, Vitest, focused and responsive Playwright suites, production build, screenshot comparison, and source review against the web-interface guidelines.

## Non-goals

- No redesign of desktop information architecture.
- No authentication, API, RLS, migration, or production configuration changes.
- No production data mutation, deployment, commit, push, or merge.
- No replacement of the existing header, footer, cards, dialog primitives, or navigation-performance strategy.
