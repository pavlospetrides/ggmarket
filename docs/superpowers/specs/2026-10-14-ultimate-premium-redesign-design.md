# GGMarket Ultimate Premium Redesign

## Research evidence

Research was performed on 2026-10-14 with Chrome DevTools at 1440x900 and 390x844. Screenshots were reviewed directly; inaccessible states are recorded rather than inferred.

| Reference | What rendered | Useful principle | GGMarket influence | Do not copy |
| --- | --- | --- | --- | --- |
| PlayStation | Desktop and mobile homepage hero/navigation, partly obscured by consent UI | A cinematic first frame, compact navigation, decisive CTA | One authored campaign image and short action-led copy | Brand artwork, carousel behavior, game IP, oversized consent UI |
| Razer | Desktop and mobile homepage with location/consent overlays | High-contrast product staging and strict black navigation | Controlled lighting and crisp action hierarchy | Green identity, branded products, promotion bars |
| NZXT | Desktop and mobile homepage hero | Product and copy read as one composition; mobile crop is separately considered | Copy-safe art direction and compact mobile hierarchy | Retail/subscription claims, pastel campaign styling |
| StockX Electronics | Login/bot gate only at both widths | No reliable visual inspection was possible | None beyond acknowledging access control | Authenticity/guarantee claims or inferred layouts |
| GOAT | Security block page at both widths | No reliable visual inspection was possible | None | Luxury-marketplace layouts inferred from memory |
| Back Market IE | Cloudflare verification at both widths | No reliable visual inspection was possible | None | Refurbishment, warranty, or protection claims |
| Apple | Desktop and mobile product campaign modules | Exact hierarchy, disciplined type, image-first mobile stacking | Fewer stronger actions; intentional mobile composition | White retail identity, product imagery, campaign layout |
| Nothing | Consent layer at both widths; underlying editorial shell partly visible | Distinctive typography and graphic system can create identity | A repeatable catalogue motif and deliberate labels | Dot-matrix imitation, white palette, consent treatment |
| Linear | Navigation rendered at both widths; animated hero content did not settle in capture | Consistent controls, quiet dark chrome, tight spacing | Application surfaces use one token system and focused states | SaaS copy, black voids, animated content that misses first paint |
| Steam | Desktop and mobile store home | Dense gamer-oriented discovery and prominent search | Search and browsing remain immediately useful | Dated chrome, horizontal clipping, promotional clutter |

The previous GGMarket screenshots were materially weaker because a user PS5 photo carried the entire campaign, sections below it disappeared into several screens of empty black ground, reveal timing hid content from full-page capture, hierarchy collapsed into small isolated labels, and editorial imagery was not distinguished from real inventory.

## Candidate directions

1. **Loadout atlas (selected)** — A cinematic gaming studio introduces a specimen-catalogue system. Editorial category art is visually rich but clearly separate from real listings. This best solves sparse inventory while remaining marketplace-first.
2. **Pinned exchange floor** — A sticky campaign title with scrolling full-height category scenes. Visually strong but too motion-heavy and too dependent on many large assets.
3. **Market contact sheet** — Dense thumbnail rows and compact metadata. Excellent for large inventory, but with one or zero listings it reads as unfinished.

The selected direction was dealt by design-taste as `specimen-catalogue`, seed `1043575883`. It was chosen for brand fit, sparse-inventory resilience, responsive feasibility, and its ability to separate editorial discovery from real sale items.

## Core idea

**On this page, a gamer's loadout becomes a cinematic field guide to what can be found, sold, and put back in play.**

The live thing is real search, category navigation, filters, favorites, profiles, messages, offers, trades, and listing creation. Editorial images never masquerade as listings.

## Visual system

- Preserve GGMarket graphite/navy, purple-indigo action, cyan information, and semantic colors.
- Use generated desktop and mobile campaign imagery in `public/images/brand/`, served through `next/image`.
- Keep display type confident but bounded to two lines. Use dense body and metadata scales for marketplace tasks.
- Build category discovery as staggered catalogue fields rather than repetitive generic cards.
- Keep real listing cards compact and factual: image, intent/condition, title, price, location, seller.
- Remove viewport-driven reveal behavior that can leave content invisible; motion is progressive enhancement and reduced-motion safe.
- Use glass only for navigation or overlays where separation is necessary. No generic glow, gradient blobs, fake telemetry, or fabricated market activity.

## Homepage argument

1. **Find your next setup** — original cinematic gaming-world image, search, Browse Marketplace, Sell Your Gear.
2. **Every way to play** — real category links presented as editorial specimens.
3. **Just listed** — only real inventory, with an intentional one-item and empty state.
4. **Direct by design** — existing profiles, item checks, messaging, offers and trades explained without unsupported promises.
5. **Ready for its next player** — listing creation CTA with the campaign visual returning as a cropped closing image.

## Route system

- Public discovery (`/`, `/marketplace`, `/search`, `/browse`) uses cinematic editorial framing with dense transaction controls.
- Listing detail prioritizes gallery, price, condition, seller identity, delivery, and existing actions.
- Auth and sell flows use a focused two-zone composition with the same typography, fields, and states.
- Profile, settings, favorites, saved searches, messaging, notifications, and administration use restrained application surfaces derived from the same tokens, without forcing campaign layouts into work screens.
- Mobile uses 16px gutters, 44px targets, persistent safe-area navigation, stacked hero copy, the portrait campaign asset, single-column high-risk forms, and a filter sheet with focus restoration.

## Constraints

- Preserve all data access, auth, API, validation, RLS, migrations, and business behavior.
- Do not fabricate listings, activity, ratings, guarantees, or transaction states.
- No external reference assets are shipped.
- No dependency installation, commit, push, deploy, or production mutation.
- Required widths: 320, 375, 390, 430, 768, 1024, 1440, 1920.

