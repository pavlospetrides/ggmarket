# GGMarket frontend route audit — 2026-10-14

Status reflects source inspection plus targeted Chromium rendering at 390x844 and 1440x900. Protected-route visual findings use the authenticated Chrome DevTools session where noted. This is a pre-implementation audit, not a completion report.

| Route | Severity | Verified issue / design risk | Coverage gap |
| --- | --- | --- | --- |
| `/` | High | Mobile controls compete with a multi-object image; both desktop/mobile hero images are priority-loaded. | No image-request assertion or durable screenshot check. |
| `/browse` | Critical | No visible mobile search; two `<main>` landmarks; horizontal desktop-style hero composition. | Dedicated E2E still expects removed carousel. |
| `/marketplace` | High | Min/max inputs lack individual names; custom sheet lacks focus containment/inert background; capped results look like total. | No focus cycle, invalid range, pagination, or error-state test. |
| `/search` | High | Refinement submits to Marketplace and can lose canonical Search state; same filter/count defects. | No refinement, special-character, zero-result, or pagination test. |
| `/listing/[id]` | High | Long seller/spec text can overflow; gallery/report overlays lack full modal behavior; mobile actions can crowd fixed navigation. | No 320px long-content or modal keyboard coverage. |
| `/listing/[id]/edit` | Medium | Image deletion is immediate; edit states lack responsive/failure coverage. | Photo deletion, failure, and status variants untested. |
| `/profile` | Critical | Authenticated 390px render proves username overflow into Edit Profile; actions compete with identity. | Responsive suite only sees login redirect. |
| `/profile/[username]` | High | Same long-name/review containment risk in public state. | No adversarial long content or empty/verified variants. |
| `/profile/listings` | Medium | Header/action row is vulnerable at 320px; no large-inventory behavior. | Missing from responsive/functional suites. |
| `/favorites` | Medium | Shared cards/layout only; protected real state not responsive-tested. | Redirect is currently mistaken for page coverage. |
| `/messages` | High | Long participant/title/date can compress the dense row. | No 320/375/430 inbox or empty/error visual coverage. |
| `/messages/[id]` | Critical | Timeline is not viewport-bounded; composer can move below viewport; offer amount lacks a label; incoming updates lack log/live semantics. | No long-thread/keyboard/error/reconnect coverage. |
| `/notifications` | Medium | User-generated title/body lack explicit containment. | Omitted from responsive matrix. |
| `/saved-searches` | High | Delete has no confirmation/undo; mutation failures lack visible recovery. | Protected responsive coverage is only a redirect. |
| `/sell` | High | Hidden category/file controls have invisible keyboard focus; errors are not consistently linked/focused; no unsaved-work guard. | Success only; no keyboard/error/upload/mobile-width matrix. |
| `/settings` | High | No unsaved-change guard; username input misses spellcheck handling; anchor/focus behavior is weak. | Real protected layout is not responsive-tested. |
| `/settings/verification` | Medium | No no-listings state; generated code lacks busy/live feedback. | Entire route untested. |
| `/login` | Medium | Auth errors are not associated with fields or focused. | No invalid-login accessibility/loading/320px check. |
| `/register` | Medium | Same error/focus defects. | Missing from route inventory tests. |
| `/forgot-password` | Medium | Error recovery copy/live behavior is weak. | No E2E/responsive coverage. |
| `/reset-password` | Medium | Mismatch error is not linked/focused on confirmation. | No E2E/responsive coverage. |
| `/admin` | High | Listing removal is immediate; fetched 50 rows are presented as total; action can remain busy after exception. | No confirmation/failure/>50/empty responsive coverage. |
| `/offline` | Low | Retry always navigates home rather than the interrupted destination. | No offline/service-worker test. |
| `/auth/callback` | Medium | User-facing invalid/expired-code path is not visibly covered. | No callback failure evidence. |

## Shared findings

- `app/globals.css` globally defines focus, then `.input:focus { outline: 0 }` weakens every input/select keyboard state.
- Fixed mobile navigation respects the bottom safe area, but overlays and page-level sticky actions do not follow one shared stacking/clearance contract.
- The header advertises a `/` shortcut without implementing it.
- `tests/e2e/responsive.spec.ts` visits six protected routes anonymously and therefore validates login rather than product layout.
- Stateful browser tests have a notification cleanup mismatch and must not run against a valuable/shared Supabase project.
- Required final matrix expands from eight widths to 320, 360, 375, 390, 393, 430, 768, 1024, 1280, 1440, and 1920 in Chromium and WebKit.

## Baseline tool evidence

- Chrome DevTools: authenticated profile, homepage, and Browse rendered at 390x844; profile overflow and missing Browse search measured in-page.
- Playwright CLI: homepage, Browse, unauthenticated profile redirect, and desktop homepage screenshots captured under `.taste-skill/audit/`.
- 21st.dev: authenticated searches and two source retrievals completed; neither retrieved component is a safe direct dependency fit.
- shadcn: configured `@shadcn` registry confirmed; Sheet selected for minimal accessible overlay integration.
- Context7 and pinned Next.js 16 docs: confirmed responsive art direction with `getImageProps()`/`<picture>` and the `priority` deprecation.
- Taste lint: 49 failures, 9 warnings. Runtime inspector: unavailable because its CDP navigation timed out during shared browser activity.
