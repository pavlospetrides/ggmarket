# Supabase and migration policy

These rules apply under `supabase/` in addition to the repository root instructions.

## Migration integrity

- Preserve these seven existing migrations and their order:
  1. `202610010001_core_schema.sql`
  2. `202610020001_phase1_stabilization.sql`
  3. `202610030001_phase2_marketplace.sql`
  4. `202610030002_fix_saved_search_publish.sql`
  5. `202610030003_fix_saved_search_similarity.sql`
  6. `202610030004_fix_conversation_read_receipts.sql`
  7. `202610030005_production_security_hardening.sql`
- Treat existing migrations as immutable history. Add a new, ordered migration for later corrections; do not rewrite, reorder, rename, or delete the seven files.
- `202610030005_production_security_hardening.sql` is currently untracked. It is a deployment blocker until its SQL and dependencies are reviewed, it is placed under version control deliberately, and its application to the intended Supabase environment is verified.
- Inspect the full migration chain and current schema assumptions before proposing SQL. Account for repeatability, lock duration, existing data, backfill cost, rollback/forward-fix strategy, and compatibility with deployed application code.
- Never run destructive, irreversible, or production-targeted SQL without explicit user authorization and a verified target. Prefer additive, staged migrations and recoverable forward fixes.

## Authorization and data protection

- RLS is a required security boundary. Do not disable or weaken it, broaden grants for convenience, or rely only on UI/API filtering.
- Review policies by actor and operation: anonymous, authenticated owner, counterparty, moderator/admin, and service role; cover `SELECT`, `INSERT`, `UPDATE`, and `DELETE` independently.
- Keep privileged functions narrowly scoped. For `SECURITY DEFINER`, pin a safe `search_path`, schema-qualify objects, restrict execution grants, and validate caller authorization inside the function.
- Never expose, print, commit, or send service-role keys. They belong only in trusted server-side or isolated test tooling and must never enter browser bundles, client components, screenshots, fixtures, or logs.
- Minimize returned columns and protect private profile, messaging, report, moderation, verification, and transaction data. Review storage, realtime, and database policies together when a feature crosses them.
- Do not substitute mock production data or silent fallbacks when live data access fails. Surface the failure safely and diagnose the real authorization or data issue.

## Validation and environment safety

- Validate migrations in an isolated, disposable Supabase environment before production. Confirm the target without printing credentials or complete connection strings.
- Exercise positive and negative authorization cases, including cross-user access and unauthenticated access. A happy-path query alone is not RLS verification.
- Review generated types and application assumptions after schema changes, then run the relevant unit/integration and E2E coverage. Report exactly what ran and where.
- Never infer that repository migration presence means a remote database is current. Verify migration history through a successful, authorized read-only check or report that database state is unknown.
