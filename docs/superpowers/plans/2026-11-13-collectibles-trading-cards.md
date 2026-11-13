# Collectibles & Trading Cards implementation plan

**Goal:** Add a stable collectibles taxonomy, simplified optional-detail seller flow, discovery filters, trust copy, and full marketplace integration without regressing existing categories.

**Spec:** `docs/superpowers/specs/2026-11-13-collectibles-trading-cards-design.md`

### Task 1: Additive category and taxonomy contract

- Add one migration that upserts the existing `collectibles` slug with its new display name and schema.
- Add collectible subcategories, product types, context-aware fields, validation, formatting, filter keys, and search intent to the central taxonomy.
- Test all requested card, sealed, figure, collection, bundle, custom, grade, and minimal payloads before implementation.

### Task 2: Simplified create/edit experience

- Make the separate product/model entry unnecessary for collectibles and derive the existing API hint from title.
- Put all nonessential collectible fields in a reusable collapsed **Additional details (optional)** section.
- Preserve city-only location, draft state across steps, category-switch isolation, edit restoration, and R2 uploads.
- Add focused component/API tests.

### Task 3: Discovery, details, SEO, and marketplace integration

- Expose category-scoped URL filters through the existing marketplace browser.
- Render seller-provided grading/authenticity disclosure on listing detail.
- Verify category discovery, search inference, related listings, saved searches, favorites, profiles, reports, offers/trades, SEO, and sitemaps use generic paths.
- Add read-only responsive Chromium/WebKit harness coverage.

### Task 4: Security review and delivery

- Review cross-account mutation, attribute injection, category switching, custom input bounds, certification claims, and formatter scoping.
- Run TypeScript, ESLint, full Vitest, production build, Chromium, WebKit, and relevant SQL/API tests.
- Document migration/deployment/rollback and combined post-merge checks.
- Commit, push `feat/collectibles-trading-cards`, and open a separate PR to `main`; do not merge or deploy.
