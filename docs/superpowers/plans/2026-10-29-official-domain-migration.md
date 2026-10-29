# GGMarket Official Domain Migration Implementation Plan

**Source brief:** `C:\Users\Pavlos\.codex\attachments\04d378b7-4442-4c3b-8b25-392245913acf\Pasted text.txt`

**Goal:** Make `https://ggmarket.eu` the canonical production origin while preserving localhost development, Vercel preview deployments, safe relative authentication redirects, and all existing security-audit work.

## Global constraints

- Do not contact or mutate production services.
- Do not edit `.env.local`, Supabase credentials, database policy, provider settings, or production data.
- Do not commit, push, deploy, reset, stash, or discard existing work.
- Keep local URLs where they are local-development/test infrastructure.
- Preserve the production host-header pin and open-redirect protections.

## Task 1 — Central URL and redirect contracts

- Add failing tests for the canonical origin, production pinning, Vercel preview selection, local/LAN behavior, malformed configuration fallback, and exact legacy-host redirects with path/query preservation.
- Implement one URL helper and consume it from request security, auth callback generation, root metadata, and the request proxy.
- Ensure only `www.ggmarket.eu` and the former production hostname redirect; arbitrary Vercel preview hosts must not redirect.

## Task 2 — SEO, share, and discovery contracts

- Add failing tests for canonical root metadata, listing/profile canonicals, sitemap, robots, and PWA start URL.
- Add canonical/Open Graph/Twitter metadata, dynamic listing/profile canonical URLs, canonical listing sharing, `sitemap.xml`, and `robots.txt`.
- Keep private/account/test routes out of indexing and out of the sitemap.

## Task 3 — Auth, email, inventory, and documentation migration

- Update production auth/email regression expectations and the Supabase email template.
- Update active production-smoke inventory and its safety tests to the official hostname.
- Update operational setup documentation and environment-variable guidance; retain localhost examples that are explicitly local.
- Record manual Vercel/Supabase verification steps without changing either service.

## Task 4 — Verification and final audit

- Run targeted domain/auth/SEO tests, the full Vitest suite, TypeScript, ESLint, production build, and the SQLMap runner unit tests affected by inventory changes.
- Search again for former-domain and ambiguous application-URL references, classifying any deliberate historical/local references.
- Review the final diff for redirect loops, preview breakage, open redirects, accidental secret/config changes, and unrelated modifications.

## Rulings

- The supplied migration brief is the approved design; no additional design checkpoint is required.
- Canonical SEO output always names `https://ggmarket.eu`. Preview request/auth origins use Vercel's trusted deployment URL, while production remains pinned to the canonical origin.
- No commits will be created because the user explicitly prohibited them; verification evidence and the working-tree diff are the handoff record.
