# R2 listing media verification and independent security review

Date: 2026-11-12 (Europe/Athens). Feature branch: `feat/r2-image-storage`; original base: `37d9e012f8a378ed2143e542b52ca37ee64b3d4e`.

## Scope and observed safety boundaries

This work resumed the existing worktree and Task 1. The original checkout's unrelated uncommitted work was not edited or copied. Dependencies were reused, with only incremental installs for AWS S3/presigner, the server-only guard, embedded PostgreSQL tests, and the TypeScript CLI loader; no `npm ci` rerun occurred. No production database, bucket, Vercel setting, image object, deployment, or merge was modified. No live cloud image migration, upload, removal, or R2 credential validation was performed.

## Implementation coverage

- Default-off `MEDIA_STORAGE_PROVIDER` selection; R2 config validation at provider initialization; generic failure messages.
- Caller-bound authentication/ownership/status reads and active-account RPC before upload; existing suspension, ownership/path/count triggers and RLS preserved.
- Existing Sharp byte/content validation, limits, metadata stripping, sequential WebP variants, stable IDs, and retry behavior retained.
- Server-only protected provider assignments, digest-pinned payloads, exact safe keys, metadata after all storage writes, and private orphan retention after ambiguous outcomes.
- Provider-aware signing after RLS-backed listing/image selection, first-card collection selection, legacy original fallback, direct unoptimized rendering, and expired-URL recovery.
- Transactional authorized-deletion cleanup outbox with actual deleted-row provider/path snapshots, permanent retry tombstones, guarded cleanup completion, and explicitly gated operator retries.
- Verified, bounded, cursor-resumable R2 backfill with full SHA-256 destination readback, metadata compare-and-swap, safe retry cursor, sanitized reports, and no source deletion.
- Provider/snapshot guards on the older Supabase variant backfill.

## Verification evidence

Final checks below ran on the repaired implementation. Earlier resolved failures are retained to make the evidence and environment limits explicit.

| Check | Observed result / scope |
| --- | --- |
| Baseline | Previous session: 86 files, 632 Vitest tests passed; Task 1 resumed with 9/9 focused tests passing |
| Final full Vitest | `npm test`: 98 files, **699 tests passed** |
| TypeScript | `npm run typecheck` passed after cleanup/outbox changes |
| ESLint | `npm run lint` passed; a temporary local trace-inspection script caused one lint error and was removed before the passing rerun |
| Production build | Unconfigured `npm run build` compiled/typechecked, then failed prerender with missing public Supabase settings; final `node scripts/verify-media-build.mjs` passed compilation, TypeScript, and prerender against a local empty API fixture. No live schema/R2 integration implied; this build is not a deployment artifact |
| Cloud adapter tests | Mock S3 transport with real command objects; real offline SDK SigV4 GET signing with fake keys and R2 endpoint/region/expiry assertions; no R2 requests |
| SQL tests | Real disposable embedded PostgreSQL executes new migration and selected existing listing/image RLS/path policies: untrusted provider changes denied, protected assignments unreadable, private drafts hidden, legacy paths intact, deletion outbox/tombstone/transaction/cascade behavior verified. This is not a hosted full-schema migration run |
| Final browser suite | Chromium + WebKit: **12/12 passed** in 44.2 seconds using local mock-only harnesses; upload/progress/cancel/order/edit recovery and expired URL renewal with exactly one RSC refresh and no listing `/_next/image` request |
| Production dependency audit | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities. Install reported the same seven pre-existing moderate development findings; no unrelated dependency remediation applied |
| Security mutation scripts | `security-audit.mjs`, `phase2-security-audit.mjs`, and `image-upload-audit.mjs` each refused execution at the `E2E_ALLOW_MUTATION` safety gate before connecting. They were not passed or run against production |
| Backfill and cleanup CLI | Credential-free help works; missing apply authorization fails safely; backfill behavior uses memory-only storage doubles |
| Client/source safety scans | All 53 client build files contained no R2 credential environment names or build-secret sentinels. Changed-source credential-pattern scan and `git diff --check` passed |

Browser setup initially failed before tests because Playwright probed `/` without Supabase settings. The local harness probe fixed readiness. The first new refresh spec then exposed relative fixture URLs being unrecognized and a brittle assumption about Next/Image's hydration retry count. A failing expiry regression was added, relative URL parsing was corrected, and the browser assertion now measures the application's one refresh and successful renewed image. Existing sell/edit behavior passed throughout the actual test run. Generated screenshots are written to Playwright's temporary output directory rather than overwriting tracked audit artifacts.

## Independent review

A separate read-only security reviewer examined `37d9e01..86acac5`, the plan/spec/runbook, production call sites, and isolated memory-only probes. It made no changes and no cloud calls. It found no Critical issues and three Important issues; no minor findings were deferred.

1. **Concurrent deletion/retry could lose a live object's bytes.** Metadata could be recreated with a previously valid upload ID between deletion and object cleanup. **Resolved:** an atomic deletion outbox doubles as a permanent image-ID tombstone; upload reservations reject tombstoned IDs, and the insert trigger checks under a per-image transaction advisory lock shared with deletion. Deleted IDs cannot be reused; a new replacement uses a fresh UUID. SQL tests cover attempted resurrection and transaction rollback. A PostgreSQL lock conflict aborts a metadata operation safely; object cleanup only follows a confirmed affected-row delete.
2. **Cleanup metadata was not durable.** A crash or storage failure after metadata deletion lost arbitrary legacy paths and provider. **Resolved:** an `AFTER DELETE` trigger captures exact provider/path arrays in the same transaction, without a foreign key that could cascade them away. Immediate cleanup and an approved manual retry CLI use that snapshot and mark success without deleting tombstones. SQL cascade/rollback and failed-object-removal tests verify retention.
3. **Older Supabase backfill could corrupt migrated rows.** It could attach newly generated Supabase-only variants to an R2 row or race a provider migration. **Resolved:** select/filter Supabase provider explicitly, reject R2 rows in the planner, and guard updates by provider plus all original path snapshots. The R2 planning regression failed before the fix; a simulated concurrent migration now rejects the metadata update.

The review found no new production signing bypass in the inspected call sites. The author implemented and regression-tested the three fixes; this report does not claim a second independent review of the repaired diff.

## Remaining rollout gates

Live R2 access, actual bucket privacy/API credential scope, hosted Supabase migration/RLS parity, and the configured Vercel deployment are unverified. They require the separately approved disposable-environment checks in the runbook before enabling R2. The PR is reviewable with R2 disabled by default, but this evidence is not permission to enable it in Production.

Ambiguous uploads retain private objects rather than risking concurrent data loss. Their reservation/log backlog needs operator reconciliation. Authorized deletion jobs have durable retry tooling; completed tombstones must be retained. Full cross-connection lock contention is not simulated by embedded PostgreSQL; exercise parallel upload/delete retries in the disposable hosted test environment before rollout.

## Delivery and operations

See [the operations runbook](../operations/r2-listing-media-runbook.md) for the exact migration, environment variables, Vercel sequence, integration checks, cleanup retry/backfill commands, capacity model, rollback, and approval boundaries. Production backfill and retirement of Supabase sources remain separately gated.
