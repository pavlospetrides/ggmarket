# GGMarket design system

This document governs GGMarket's visual and interaction work. Existing implementation and tokens in `app/globals.css` are the source of truth; inspect them before proposing new primitives.

## Brand direction

- Preserve dark graphite and navy surfaces, purple/indigo primary accents, cyan highlights, and the established gradients and glass effects where they improve hierarchy.
- Keep marketplace interfaces compact, information-dense, and quick to scan. Favor clear product imagery, price and trust signals, concise controls, and predictable navigation over decorative whitespace.
- Reuse existing color, spacing, radius, shadow, typography, and motion tokens. Extend the token system only when an existing token cannot express a recurring need.
- Maintain a recognizable GGMarket experience across landing, browse, listing, account, messaging, and administration surfaces without forcing every surface into an identical composition.

The GGMarket brand overrides generic aesthetic advice. `design-taste-frontend` may improve composition, typography, imagery, and polish on public-facing pages, but it must not replace the palette, erase the marketplace density, introduce a competing visual system, or flatten purposeful gradients and glass. It is not the default tool for dashboards or application screens.

## Component and layout policy

- Reuse repository components and patterns before adding variants. Prefer a focused extension over a parallel component family.
- Do not combine design systems blindly. shadcn patterns are candidates only when `components.json` and the relevant session tooling confirm project support; imported patterns must be adapted to GGMarket tokens and conventions.
- Use 21st.dev only after authentication succeeds and only when its output fits the existing architecture and brand. Treat generated UI as a proposal requiring local review, not as authority.
- Preserve responsive behavior from mobile through wide desktop. Compact does not mean cramped: controls need usable hit targets, readable type, visible focus, and sufficient contrast.
- Keep hierarchy explicit: primary actions, pricing, availability, seller trust, and transaction state must be visually unambiguous. Avoid unnecessary badges, pills, cards, gradients, and animation.
- Use existing icon and image conventions. Optimize media through the installed Next.js APIs and verify the applicable version-pinned documentation before code changes.

## UX and accessibility gates

- Use semantic HTML, keyboard-operable controls, visible focus states, meaningful labels, correct headings, and appropriate live-region behavior.
- Check contrast and do not convey status by color alone. Respect reduced-motion preferences and avoid motion that delays marketplace tasks.
- Provide explicit loading, empty, error, disabled, success, and permission-denied states where the flow can reach them.
- Validate high-risk flows—authentication, listing creation/editing, offers, trades, messaging, reports, and moderation—with realistic states and responsive layouts.
- Review frontend work with `web-design-guidelines`; use browser inspection and screenshots for visual findings, and project Playwright tests for repeatable behavioral assertions.

## Design change evidence

Before completion, compare the changed surface against existing GGMarket screens and tokens. Report what was inspected, which viewport and interaction states were checked, and any unavailable browser or MCP tooling. Never claim visual verification from source review alone.
