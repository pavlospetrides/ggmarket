# SQL Injection Audit Suite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable, source-aware SQL injection inventory, safe Windows runner, automated reports, and regression suite for GGMarket.

**Architecture:** A versioned JSON inventory maps real GGMarket inputs to Supabase/PostgreSQL sinks. A standard-library Python runner validates safety, runs isolated SQLMap targets sequentially, performs strictly budgeted production GET smoke probes only after explicit opt-in, redacts secrets, classifies evidence conservatively, and writes JSON/CSV/Markdown reports.

**Tech Stack:** Python 3 standard library, PowerShell 7/Windows PowerShell, SQLMap, unittest, Next.js/Supabase source metadata.

**Spec:** `docs/superpowers/specs/2026-10-28-sql-injection-audit-suite-design.md`

## Global Constraints

- Do not run SQLMap against production during development.
- Never persist or log session cookies, access tokens, API keys, service-role keys, or private user data.
- Execute targets sequentially by default and enforce delays, retries, per-target timeouts, and production request budgets.
- Production mode is HTTPS GET-only, exact-host/path allowlisted, explicitly opted in, and never performs state-changing or extraction behavior.
- Scanner heuristics are never automatically promoted to confirmed vulnerabilities.
- Do not change application behavior, migrations, Vercel, or Supabase production configuration.

## Review Focus

- A production hostname hidden behind redirects must be rejected before credentials or probes leave the approved origin.
- Missing fixture/auth environment variables must produce blocked coverage, not malformed requests or false passes.
- Timeout/cancellation must terminate the child and prevent later targets from starting.
- SQLMap output containing preliminary injection text plus the false-positive conclusion must classify as false positive.
- Reports and per-target logs must redact header, cookie, token, JWT, and key values even in exception text.

---

### Task 1: Repository-specific inventory

**Files:**
- Create: `security/sqlmap/targets.json`
- Create: `security/sqlmap/README.md`

**Interfaces:**
- Produces: inventory schema consumed by `load_inventory(path)` and operator fixture/environment contract.

- [ ] Map every discovered Next.js database entry point and callable RPC with actual method, parameters, auth, sink, source files, risk, and automated/static/manual disposition.
- [ ] Define local SQLMap templates and exact production-safe GET allowlist entries.
- [ ] Document synthetic fixture variables, SQLMap discovery, Windows commands, status meanings, and production restrictions.
- [ ] Validate JSON parsing with `python -m json.tool security/sqlmap/targets.json`.

### Task 2: Safety and inventory core

**Files:**
- Create: `security/sqlmap/tests/test_runner.py`
- Create: `security/sqlmap/runner.py`

**Interfaces:**
- Produces: `load_inventory`, `validate_execution`, `select_targets`, `expand_template`, `redact`, and `build_sqlmap_command`.

- [ ] Write failing tests for valid inventory, loopback default, preview opt-in, production exact opt-in/HTTPS/host/path/method gates, missing fixtures, redaction, and conservative SQLMap arguments.
- [ ] Run `python -m unittest discover -s security/sqlmap/tests -v` and verify failures are caused by missing runner interfaces.
- [ ] Implement the minimum validation, selection, expansion, redaction, and command construction behavior.
- [ ] Rerun the focused unittest suite to green.

### Task 3: Sequential execution and classification

**Files:**
- Modify: `security/sqlmap/tests/test_runner.py`
- Modify: `security/sqlmap/runner.py`

**Interfaces:**
- Produces: `AuditRunner.run()`, `classify_sqlmap_output`, cancellation, timeout/retry handling, and production `HttpProbe` budget enforcement.

- [ ] Write failing tests proving ordered execution, no parallelism, retry/timeout status, cancellation stop, production request budget, WAF/server-error stop, unstable response classification, and false-positive handling.
- [ ] Run focused tests and observe the expected failures.
- [ ] Implement sequential subprocess execution and budgeted native HTTP smoke probing with same-origin redirect rejection.
- [ ] Rerun the focused tests to green.

### Task 4: Reports and Windows entry point

**Files:**
- Modify: `security/sqlmap/tests/test_runner.py`
- Modify: `security/sqlmap/runner.py`
- Create: `security/sqlmap/run-tests.ps1`
- Create: `security/sqlmap/reports/summary.json`
- Create: `security/sqlmap/reports/summary.csv`
- Create: `security/sqlmap/reports/SECURITY_REPORT.md`

**Interfaces:**
- Produces: `write_reports(results, inventory, reports_dir)` and PowerShell argument forwarding.

- [ ] Write failing tests for deterministic JSON/CSV/Markdown generation, status totals, untested parameters, manual-review items, source locations, and secret-free artifacts.
- [ ] Run focused tests and observe missing-report failures.
- [ ] Implement report writers, CLI exit semantics, per-target redacted logs, and the PowerShell wrapper.
- [ ] Generate baseline reports with `--validate-only` without network access.
- [ ] Rerun focused tests to green.

### Task 5: Full validation and source audit handoff

**Files:**
- Modify: `security/sqlmap/reports/SECURITY_REPORT.md`
- Modify: `security/sqlmap/README.md`

**Interfaces:**
- Consumes all earlier tasks; produces final reusable audit deliverables.

- [ ] Run Python unittests, JSON validation, runner validate-only and dry-run modes, repository Vitest, TypeScript, ESLint, and `git diff --check`.
- [ ] Confirm no production request occurred and no credential value appears in reports/logs.
- [ ] Record exact discovered/testable/blocked counts, source conclusions, previous bounded localhost SQLMap evidence, and remaining manual coverage.
