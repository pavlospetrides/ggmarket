# GGMarket Premium Marketplace Redesign

## Intent

GGMarket should feel like a premium player-to-player gaming market: product-led, confident, quick to scan, and trustworthy without resembling a conventional retailer or a generic gaming SaaS landing page. The redesign must make real listings the visual center of the experience and preserve every existing Supabase-backed capability.

## Goals

- Make the homepage immediately explain that GGMarket connects individual buyers and sellers of gaming gear.
- Give real listing photography, price, condition, seller identity, and location clear visual priority.
- Build one cohesive UI language across public discovery, marketplace, listing detail, authentication, profiles, favorites, settings, messages, and selling flows.
- Produce intentional responsive compositions from 320px through 1920px with 44px minimum interactive targets.
- Preserve server rendering, narrow client boundaries, existing routes, data access, validation, authorization, and database behavior.
- Respect reduced motion, keyboard navigation, visible focus, semantic HTML, contrast, and explicit empty/loading/error states.

## Non-goals

- No database, migration, RLS, authentication, API contract, payment, or production configuration changes.
- No invented listings, reviews, seller activity, marketplace statistics, or transactional capabilities.
- No new UI framework, animation library, or large dependency.
- No deployment, commits, or production data changes.

## Anti-goals

- Neon-heavy cyberpunk styling, generic dashboards, glass-card grids, decorative gradients, fake “live market” interfaces, oversized empty sections, and animation that delays shopping.
- A visual redesign that removes or obscures existing marketplace functionality.
- Desktop layouts merely squeezed onto mobile.

## Discovery findings

- The current application already has mature marketplace, auth, favorites, messaging, offers, trade, verification, reporting, profile, notification, and selling behavior.
- The visual system is fragmented by one-off colors, gradients, outlined cards, shadows, glass effects, eyebrow labels, and inconsistent section patterns.
- The current homepage foregrounds a synthetic “live market” mockup while real listing imagery is secondary.
- Current mobile composition gives categories and the sell banner more visual weight than listing discovery.
- Baseline checks pass: TypeScript, ESLint, and 11 Vitest assertions.
- The baseline visual inspector reports 15 page-level failures and 5 warnings, including insufficient imagery, excessive gradients/shadows/rules, small text, fallback typography, and a tablet headline wrap.

## Art direction

- Direction: **The object, large** (design-taste seed `950238129`).
- Idea sentence: **On this page, real gear from real players becomes the oversized marketplace specimen.**
- Live thing: the search and category/listing navigation work directly against real routes and real listing data; no simulated product configurator or fake activity is introduced.
- Palette: preserve GGMarket graphite/navy grounds, purple-indigo primary action, cyan information accent, and existing semantic colors. Replace gradients with flat fields and tonal steps. Purple remains because it is an established brand constraint.
- Type: one self-hosted variable sans through `next/font`; large geometric display settings, compact readable body copy, five practical size steps, and no text under 13px.
- Shape: use the existing rounded identity more deliberately with one compact radius family. Cards are defined primarily by surface tone and image crop, not borders or shadows.
- Motion: short transform/opacity entrances and direct control feedback; no motion dependency for comprehension; all motion disabled under `prefers-reduced-motion`.

## Homepage argument and copy deck

1. **Gaming gear, player to player** — prove it with the newest real listing shown at hero scale and a direct marketplace search.
2. **Shop the way you play** — prove it with real categories and direct category routes, without boxed icon-card repetition.
3. **Fresh from the market** — prove it with recently listed real inventory and honest empty states.
4. **Built for direct deals** — prove it with profiles, item checks, favorites, and direct messaging already present in the application.
5. **Put your gear back in play** — end with the existing listing creation flow.

## System behavior

- Global navigation remains server-rendered except for existing interactive islands. Desktop keeps the full marketplace search and account actions; mobile keeps the bottom navigation and a concise top row.
- Listing cards use consistent image ratios, compact two-line titles, tabular pricing, condition/location metadata, seller identity, and existing favorite behavior.
- Marketplace filters remain URL-driven and the mobile filter dialog retains its accessible roles and labels.
- Listing detail keeps the gallery/content/purchase split, seller identity, messaging, favorites, reporting, insights, and sticky mobile action.
- Forms and account surfaces inherit the same tokens and primitives while retaining their existing validation and submission behavior.
- Empty states remain honest and route users to supported actions.

## Responsive behavior

- 320–430px: 16px page margins, compact top header, persistent safe-area-aware mobile navigation, single-column complex forms/details, touch-first filters, and one or two listing columns only where content remains readable.
- 768–1024px: tablet compositions avoid three-line headings, maintain usable filter layouts, and shift detail panels without overlap.
- 1440–1920px: content may expand to a 1760px maximum while product media and dense discovery areas use the available width.
- Test widths: 320, 375, 390, 430, 768, 1024, 1440, and 1920 pixels.

## Constraints and verification

- Follow repository `AGENTS.md`, `DESIGN.md`, and `tests/e2e/AGENTS.md`.
- Use installed Next.js 16 documentation and current Context7 documentation for framework-sensitive choices.
- Do not run state-mutating E2E without confirming a disposable Supabase target. Public read-only browser exploration is allowed.
- Run TypeScript, ESLint, Vitest, production build, the design-taste lint/inspector, screenshot critique, and safe browser interaction checks before completion.
- Preserve unrelated files and all migrations.

## Builder calls

- Keep the current checkout because the user supplied this workspace for direct editing, the baseline is clean, and repository instructions prohibit commits; do not create or commit a worktree branch.
- Use existing local browse artwork only on the browse route. Homepage hero imagery comes from real listing data and degrades to a typographic/search composition when no listing image exists.
- Do not import 21st.dev or shadcn code. Their session calls are used as research only because existing components already cover the required behavior and external patterns skew toward retail add-to-cart interactions.
