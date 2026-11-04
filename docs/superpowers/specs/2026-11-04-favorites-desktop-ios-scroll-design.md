# Favorites Desktop Geometry and iPhone Scroll Stability Design

## Intent

Make the animated Favorites rail useful and premium on desktop without changing its successful mobile composition, and remove application-driven scroll oscillation on iOS while preserving native momentum, Smart Back Navigation, and the physical lanyard interactions.

## Confirmed current behavior

- Desktop card width is capped at 168px in `favorite-lanyard-rail.tsx`.
- The width calculation divides the measured stage by every item in the eight-item batch before deciding whether to use carousel mode. At 1366px, eight cards render around 137px wide.
- Mobile uses carousel mode below 640px and renders cards around 160–168px wide. That sizing and composition must remain unchanged.
- Favorites already pages large collections into batches of eight, so only eight physical simulations run at once and every item remains reachable.
- `BrowsingStateRestorer` may call `scrollTo` or `scrollBy` on every animation frame for up to 180 frames whenever any document image remains incomplete. It observes body resize and subtree mutations throughout that period.
- That restoration loop appears on Home, Browse, Marketplace, Listing Detail, Favorites, Profile, and test-harness routes. A flick or touch beginning while it is active can be opposed by repeated programmatic corrections.
- The Favorites rail classifies a downward movement over a card as a pull after 8px and captures the pointer. Cancellation releases capture, but does not treat cancellation as a distinct abort path before applying release physics.

## Design

### Responsive rail sizing

Move responsive sizing into tested pure helpers in `lib/favorite-rail.ts`. Keep the existing mobile formula below 640px. Tablet sizing is adaptive. Desktop uses measured stage width and item count with targets of roughly 210–240px from 1024–1439px and 230–260px at 1440px and above.

When all cards fit at a collision-safe pitch, render the centered physical rail. When they do not, retain large cards and switch to a bounded carousel window instead of shrinking every item. Desktop carousel mode keeps the full-length hanging geometry; only the mobile breakpoint uses compact straps. Existing batch navigation remains the outer pagination for collections larger than eight, and carousel controls expose every item within a batch.

All derived geometry—stage height, attachment points, card/font/image sizes, shadows, collision bounds, hit testing, pull limits, and drag stops—continues to derive from the measured card width. No whole-component CSS scale is used.

### Gesture arbitration

Introduce a pure gesture classifier. Mouse and pen keep immediate physical pull/drag behavior. Touch gestures require a clear directional margin; quick vertical movement remains native scrolling. A deliberate touch pull requires a short hold before downward movement. Horizontal carousel swipes activate only after horizontal intent is clear.

Pointer cancellation becomes an explicit abort path: clear pull, drag, swipe, pending click/flip, capture, and transient free-drag state; retarget cards and allow only the visual spring to settle. This prevents an interrupted page scroll from leaving custom interaction state alive.

### Scroll restoration

Replace frame-by-frame polling with event-driven correction. Apply the saved snapshot immediately, then correct only when a relevant layout event occurs (body resize, child-list mutation, image load/error, or font readiness) within a bounded restoration window.

Any clear user intent—pointer/touch start, wheel input, or scroll/navigation key—stops restoration before native momentum begins. Observers, listeners, image handlers, and RAF work are removed by one idempotent cleanup path. Smart Back still restores the saved listing anchor and horizontal rail after genuine asynchronous layout shifts, but never keeps pulling the page to an old coordinate while the user is interacting.

## Accessibility and performance

- Keep buttons, roving focus, Escape, focus restoration, and reduced-motion behavior.
- Provide desktop previous/next carousel controls while preserving the existing mobile visual treatment.
- Keep the simulation capped at eight visible items and paused when idle, offscreen, hidden, or reduced-motion is active.
- Use passive user-intent listeners where appropriate and do no synchronous work in scroll handlers.
- Maintain native page overscroll on coarse pointers and do not add global scroll locks or `touch-action: none`.

## Verification boundary

Automated Chromium and WebKit tests can verify sizing, overflow, gesture classification, pointer cancellation, programmatic-scroll counts, responsive layouts, cleanup, reduced motion, and navigation restoration. Desktop Playwright cannot reproduce physical iPhone Chrome browser-toolbar behavior; physical iPhone Chrome and Safari acceptance remains a required manual check.

