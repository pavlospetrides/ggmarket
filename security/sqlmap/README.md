# GGMarket SQL Injection Audit Suite

This directory contains a source-aware inventory and a conservative Windows runner for GGMarket. The default execution boundary is a loopback application connected to a disposable local Supabase stack. It does not discover or guess routes at runtime.

The source review found no request-controlled raw SQL sink. Next.js handlers use Supabase/PostgREST builders or typed RPC arguments. Search sorting and taxonomy keys are selected from allowlists. The PL/pgSQL `EXECUTE` statements found in migrations interpolate catalog-derived or hard-coded identifiers using `%I`, not request values. The hardened `SECURITY DEFINER` functions use an empty `search_path` and schema-qualified objects.

## Files

- `targets.json` is the versioned inventory of actual pages, routes, RPCs, parameters, authentication needs, database sinks, source locations, risks, and test dispositions.
- `runner.py` validates safety boundaries, invokes SQLMap sequentially in a local lab, redacts output, classifies evidence, and writes reports.
- `run-tests.ps1` is the Windows 11 entry point.
- `tests/test_runner.py` tests the safety controls without network access.
- `reports/` contains the current baseline. A `not_run` result is not a pass.

## Prerequisites

1. Python 3.11 or newer.
2. SQLMap from its official repository. The runner checks `--sqlmap-path`, `SQLMAP_PATH`, and the two known Downloads locations in `targets.json`.
3. The GGMarket app running locally and configured only for the disposable local Supabase stack.
4. Synthetic accounts and records. Never supply production sessions or real user data.

Before active testing, independently verify that the app's Supabase URL is loopback and that its project/API keys belong to the disposable stack. The runner validates its HTTP target, but it cannot prove where a misconfigured application sends its database calls.

## Validate without making requests

From the repository root:

```powershell
python -m unittest discover -s security/sqlmap/tests -v
python -m json.tool security/sqlmap/targets.json > $null
.\security\sqlmap\run-tests.ps1 -ValidateOnly
.\security\sqlmap\run-tests.ps1 -DryRun
```

`-ValidateOnly` parses the full inventory and generates reports without launching SQLMap or making HTTP requests. `-DryRun` also expands command templates; authenticated targets without fixtures become `blocked_fixture`.

## Local isolated audit

Create synthetic fixture data, then expose only the required values through the current PowerShell process:

```powershell
$env:GGMARKET_TEST_COOKIE_A = 'synthetic-user-a-session-cookie'
$env:GGMARKET_TEST_COOKIE_B = 'synthetic-user-b-session-cookie'
$env:GGMARKET_TEST_COOKIE_ADMIN = 'synthetic-local-admin-session-cookie'
$env:FIXTURE_USER_ID_B = '00000000-0000-0000-0000-000000000002'
$env:FIXTURE_LISTING_ID = '00000000-0000-0000-0000-000000000101'
$env:FIXTURE_LISTING_ID_A = '00000000-0000-0000-0000-000000000102'
$env:FIXTURE_CONVERSATION_ID = '00000000-0000-0000-0000-000000000201'
$env:FIXTURE_USERNAME_A = 'sqlmap_user_a'

.\security\sqlmap\run-tests.ps1 `
  -Mode local `
  -BaseUrl http://127.0.0.1:3000 `
  -SqlMapPath C:\Users\pavlo\Downloads\sqlmap\sqlmap.py
```

Run a narrow target with `-Target page-search`. Targets execute sequentially with `level 1`, `risk 1`, one thread, `BEU` techniques, identity encoding, delays, retries, and per-target deadlines. No dump, shell, file-write, enumeration, stacked-only, or destructive option is added. Press Ctrl+C to stop; later targets are not started.

Mutation-capable local targets can create disposable rows or notifications. Reset the local database after testing. Entries marked `local.enabled: false` need a purpose-built fixture test or static review because generic SQLMap traffic would be destructive, semantically invalid, multipart, or unable to preserve workflow state.

### Isolated preview

Non-loopback local mode is rejected unless both flags are supplied:

```powershell
.\security\sqlmap\run-tests.ps1 -Mode local -BaseUrl https://isolated-preview.example `
  -IsolatedPreview -AllowHost isolated-preview.example
```

Only use a preview whose application and database are disposable. Never allowlist the production hostname as an isolated preview.

## Production smoke mode

Production mode is deliberately not a production SQLMap scan. It performs a small number of native, read-only GET requests so the request budget, methods, paths, redirects, and stop conditions are enforceable. It is disabled unless the exact phrase is passed. Only `/marketplace` and `/search` are in the inventory allowlist.

```powershell
.\security\sqlmap\run-tests.ps1 `
  -Mode production-smoke `
  -BaseUrl https://ggmarket.eu `
  -RequestBudget 2 `
  -ProductionOptIn I_UNDERSTAND_PRODUCTION_SMOKE_IS_LIVE_READ_ONLY
```

Do not run this during routine development. The runner stops on an off-origin redirect, 403, 429, or server error. It never submits POST/PATCH/PUT/DELETE requests in this mode. A smoke response only validates availability; it is not evidence that a parameter is non-injectable.

## Status meanings

- `not_injectable`: SQLMap completed and explicitly found no injectable parameter.
- `suspected`: scanner evidence exists, but is not confirmed. Execution stops for source/manual review.
- `false_positive`: SQLMap explicitly rejected its preliminary indication.
- `inconclusive`: no reliable scanner conclusion.
- `blocked_fixture`: required synthetic environment data was absent.
- `not_run`: inventoried but intentionally not executed.
- `timeout`, `error`, `http_error`, `waf_or_rate_limited`, `blocked_redirect`: incomplete or stopped coverage.
- `smoke_ok`: a bounded production GET returned successfully; not an injection pass.

Only a controlled reproduction plus a matching source-level SQL sink can become a confirmed vulnerability. The runner never promotes SQLMap wording directly to `confirmed`.

## Credentials and reports

Authentication values are read from environment variables and are absent from `targets.json`. Reports redact authorization/cookie/API-key headers, JWT-shaped strings, and secret-like environment values. SQLMap still receives a local synthetic cookie as a process argument for authenticated targets, so use disposable credentials and a trusted workstation. Do not paste command lines or raw scanner directories into tickets.

Reports are regenerated as JSON, CSV, and Markdown. Local active runs also write one redacted SQLMap log per target under `reports/logs/`. The command line is not logged. Treat even redacted scanner logs as sensitive test artifacts and use only disposable identities.

## Coverage limits

The inventory includes public search/detail/profile reads, review/listing/favorite/history workflows, messaging, offers, trades, saved searches, notifications, reports, profile updates, verification, moderation, Auth entry points, RPC groups, dynamic migration SQL, and `SECURITY DEFINER` functions. Auth-provider calls, multipart Storage uploads, destructive deletes, one-time state transitions, triggers, and privileged functions remain static or purpose-built-test coverage rather than generic SQLMap coverage.

Re-run source discovery whenever a route, RPC, migration, raw SQL dependency, filter grammar, or sorting implementation changes. Add the real source and sink to `targets.json`; never add speculative endpoints.
