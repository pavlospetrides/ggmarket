# GGMarket Complete Product Rebuild Design

## Intent

Rebuild the existing frontend into one production-grade marketplace system while preserving every backend contract and all current user data. Fix the verified priority failures—mobile homepage composition, missing mobile Browse search, and mobile profile overlap—then carry the same system through every implemented user-facing route.

## Evidence and diagnosis

### Rendered product audit

- At 390x844, Browse has no visible query input; its only `q` input is hidden in the desktop header. It also nests a second `<main>` inside the root layout.
- In an authenticated 390x844 session, the profile identity column is 81px wide while the username needs 213px and uses visible overflow, painting into Edit Profile.
- The mobile homepage stacks logo, headline, description, two CTAs, and search over a multi-object portrait scene. Art and controls compete, with no single focal subject.
- Homepage desktop/mobile Next images are both marked priority. Next.js 16 deprecates `priority`; official guidance uses `getImageProps()` and `<picture>` for art direction so only the matching source is fetched.
- Taste lint reports 49 failures and 9 warnings. Its runtime inspector hit a shared CDP navigation conflict during audit, which is recorded as unavailable rather than passed.

### Structural and coverage audit

- `/browse` and `tests/e2e/browse.spec.ts` disagree: the test still expects a removed carousel.
- Protected routes in `tests/e2e/responsive.spec.ts` are anonymous, validating login redirects instead of real profile/settings/favorites/sell/messages/saved-search layouts.
- Marketplace price inputs lack individual names; its custom sheet has no focus trap or inert background.
- Search/marketplace cap fetches at 48 but show the array length as the total.
- User-generated profile, seller, notification, review, and message text lacks consistent containment.
- Chat is not viewport-bounded, so long timelines can push the composer below the viewport.
- Hidden sell controls lack visible focus, form errors are inconsistently associated, and several destructive actions lack confirmation/undo.
- Current route coverage omits important states/routes; notification E2E cleanup can leave rows behind.

## Reference analysis

- PlayStation: stable copy-safe zone and an intentionally different mobile crop.
- Razer: preserve category context on mobile with a scrollable rail.
- NZXT: strongest model—dark copy zone plus purposeful product scene, immediately followed by Filter and Sort.
- Linear: reflow type and proof media independently rather than uniformly shrinking desktop geometry.
- Apple Store: keep search/account primary and category discovery thumb-scrollable.
- Back Market: stable card scan order and explicit mobile filter/sort entry points.

StockX and GOAT were blocked by login/Cloudflare; Nothing was obscured by region selection. No blocked layout is inferred.

## Registry research

21st.dev authenticated successfully. Searches covered navigation, mobile search, profiles, drawers, cards, and bottom navigation. Both daily retrievals were inspected:

- Ecommerce Category Page, demo 29395, MIT: strong behavior reference, but its full Radix/CVA/token dependency tree is not a safe drop-in.
- Search Bar with Category Filter, demo 28463: useful compound-control semantics, but it depends on a parallel button/input/select/group system absent from GGMarket.

Both are rejected as direct integrations. Their verified patterns—joined search controls, visible result context, active filters, responsive sidebar/sheet, and explicit empty/reset states—will be adapted into existing components without copying demo data or importing their visual systems.

The configured `@shadcn` registry was inspected for Sheet, Drawer, Command, Input, Card, and navigation primitives. Sheet is selected as the smallest high-value integration because it replaces incomplete focus, Escape, portal, and background-containment behavior shared by filters and overlays. It will be adapted to GGMarket tokens with only its audited dependency/utilities.

Tabs, Dropdown Menu, Form, Avatar, Tooltip, and Skeleton were also inspected from the live registry. Skeleton is the lowest-cost loading-state candidate; Avatar is useful if real profile media/fallback behavior expands; Dropdown Menu is appropriate only for a real action menu. Tabs would hide the current profile information architecture, wholesale Form migration would duplicate established React Hook Form/Zod patterns, and Tooltip has limited touch value. They are therefore not mandatory imports. Dialog joins Sheet because centered report/gallery/confirmation semantics differ from an edge-attached sheet.

## Selected direction

**The Midnight Exchange** combines cinematic campaign moments with compact, factual marketplace operations. It retains GGMarket graphite/indigo/cyan while removing the sense that pages came from unrelated templates.

### Homepage

- Preserve the desktop campaign direction where it reads well.
- Create one mobile portrait asset with a clear focal gaming subject, calm upper copy field, and meaningful lower anchor.
- Recompose mobile into copy/action and art-payoff zones; stack actions at narrow widths and keep search out of the focal area.
- Replace dual eager images with responsive `getImageProps()` art direction.

### Browse, search, and marketplace

- Start mobile Browse with prominent labelled search.
- Follow with a compact category rail and result-oriented controls that preserve URL state.
- Keep count, filters, sort, active filters, reset, and pagination truthful and adjacent to listings.
- Use shadcn Sheet for mobile filters and a compact desktop sidebar.

### Profile

- Split banner, avatar/identity, actions, metadata, and stats into explicit regions.
- Give mobile identity full width and move actions below it. Wrap long unbroken values safely.
- Share the responsive structure across own/public and empty/few/many listing states.

### Remaining routes

- Listing detail: resilient gallery/spec/seller text, accessible overlays, and mobile action clearance.
- Auth/settings/sell: consistent groups, visible focus, connected validation, busy/error state, and unsaved-work protection where meaningful.
- Messages: bounded viewport, persistent composer, live/log semantics, and long-content containment.
- Notifications/saved searches/admin: resilient text, truthful totals, safe destructive flows, and error recovery.
- Loading/error/offline/empty states use the same tokens and offer a useful next action.

## Non-goals

- No database schema/migration, fabricated data, API contract, auth, authorization, RLS, or business-rule changes.
- No automatic commit, push, deployment, or production mutation.
- No wholesale third-party design-system import.

## Acceptance

- Every implemented user-facing route is reported PASS, FAIL, or NOT VERIFIED.
- The three priority failures have regression coverage and visual evidence.
- No horizontal overflow, clipped text, or overlapping controls at all eleven widths.
- Protected routes are tested authenticated in an isolated E2E environment.
- Sheet/dialog focus containment, Escape, backdrop/Close dismissal, scroll lock, and focus restoration pass in Chromium and WebKit.
- Fresh TypeScript, ESLint, Vitest, production build, Chromium, WebKit, accessibility, and screenshot evidence follows the final fix pass.

## Deliberate scope rulings

- Search suggestions are not implemented because the current application exposes no suggestion contract. Visible search, preserved query state, and useful empty states are required; no suggestions will be fabricated.
- The pre-implementation route/state ownership matrix is `docs/audits/2026-10-14-frontend-route-audit.md` and remains part of the acceptance evidence.
- Priority routes (`/`, `/browse`, `/marketplace`, `/search`, `/profile`, and a public profile) receive all eleven widths in both engines. Every other major route receives at least 320, 390, 768, and 1440px in both engines, with more widths when a defect is found.
- Stateful E2E is prohibited until a disposable Supabase project is identified through a non-secret project-ref allowlist and an explicit mutation flag. Without that confirmation, those rows are reported NOT VERIFIED.
