# GGMarket SQL Injection Audit Suite Design

## Intent

Build a repository-specific, repeatable SQL injection audit system that turns the current GGMarket route, Supabase query, RPC, and migration review into version-controlled test inventory and conservative automation. The suite must make the isolated lab the normal path and make accidental production mutation structurally impossible.

## Goals

- Inventory every database-connected Next.js page/API/Auth route and every callable PostgreSQL function discovered in the current code.
- Record actual methods, inputs, authentication, database sinks, source locations, risk reasoning, and test disposition.
- Run SQLMap targets sequentially with conservative options, bounded duration, retries, delays, per-target logs, and cancellation.
- Support authenticated local targets through environment-provided synthetic-user cookies/tokens without persisting or logging credentials.
- Provide an explicit production smoke mode limited to allowlisted HTTPS GET paths and a strict request budget.
- Treat SQLMap heuristics as suspected until source-aware/manual confirmation and recognize its false-positive conclusion.
- Generate JSON, CSV, and Markdown evidence from the same run model.
- Validate safety and reporting with standard-library Python unit tests.

## Non-goals and anti-goals

- No production SQLMap execution during development.
- No production POST/PATCH/PUT/DELETE, database enumeration, dumps, stacked queries, OS commands, WAF bypass, or secret extraction.
- No automatic claim that a scanner heuristic is a confirmed vulnerability.
- No embedded credentials or repository-specific production data.
- No application behavior or database migration changes.

## Architecture

`security/sqlmap/targets.json` is the authoritative inventory. Each entry describes the real route/function, parameters, auth material by environment-variable name, source/sink mapping, risk, local test template, and production eligibility. Static-only or fixture-blocked surfaces remain in the inventory and reports instead of being silently omitted.

`runner.py` validates the inventory and execution environment, selects targets in file order, expands non-secret fixture variables, invokes SQLMap only in isolated-lab mode, and classifies output conservatively. Production smoke mode uses a small native GET probe rather than SQLMap so the runner can enforce an exact request budget; enabling it requires the exact opt-in phrase, an exact hostname allowlist, HTTPS, and inventory-approved read-only paths.

The runner writes one redacted log per target and regenerates `summary.json`, `summary.csv`, and `SECURITY_REPORT.md`. `run-tests.ps1` supplies Windows-friendly defaults and forwards explicit arguments. The reports separate tested, skipped, blocked, inconclusive, suspected, false-positive, and confirmed states.

## Safety decisions

- Local mode accepts loopback by default. A preview host requires `--isolated-preview`, an explicit allowed host, and cannot be the configured production host.
- Production mode accepts only `https://ggmarket.eu`, only allowlisted GET targets, and only when the operator provides `I_UNDERSTAND_PRODUCTION_SMOKE`.
- SQLMap commands use level 1, risk 1, one thread, `Accept-Encoding: identity`, no extraction flags, and exclude stacked/time/OS-oriented behavior.
- Auth values are read at runtime from environment variables, passed without being serialized to reports, and redacted from logs and errors.
- Targets that require synthetic fixture identifiers or authentication are blocked with an explicit reason when inputs are absent.
- Cancellation terminates the current child process and does not start another target.

## Source-audit conclusion

The current application uses Supabase/PostgREST query builders and typed RPC arguments rather than raw SQL. User-selectable sort fields are explicit branches. Taxonomy JSON keys come from an allowlist. Migration dynamic SQL uses PostgreSQL `format('%I', ...)` over catalog-derived or hard-coded identifiers, not request input. Security-definer functions pin an empty search path and use schema-qualified objects. No confirmed SQL injection sink was found in the reviewed source; dynamic SQL migrations remain manual-review items because static proof is more appropriate than endpoint fuzzing.
