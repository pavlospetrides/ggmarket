#!/usr/bin/env python3
"""Source-aware SQLMap orchestration for GGMarket.

Production smoke mode deliberately uses bounded native GET probes, not SQLMap.
This makes its request budget and method restrictions enforceable.
"""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path


class SafetyError(ValueError):
    pass


class MissingFixture(ValueError):
    pass


PLACEHOLDER = re.compile(r"\$\{([A-Z][A-Z0-9_]*)\}")
JWT = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{3,}\.[A-Za-z0-9_-]{3,}\b")
HEADER_SECRET = re.compile(r"(?im)^(authorization|cookie|apikey|x-api-key):\s*.*$")


def load_inventory(path):
    payload = json.loads(Path(path).read_text(encoding="utf-8"))
    if payload.get("schema_version") != 1 or not isinstance(payload.get("targets"), list):
        raise ValueError("unsupported or invalid target inventory")
    ids = [item.get("id") for item in payload["targets"]]
    if None in ids or len(ids) != len(set(ids)):
        raise ValueError("target IDs must be present and unique")
    return payload


def validate_execution(mode, base_url, inventory, opt_in=None, isolated_preview=False, allow_hosts=()):
    parsed = urllib.parse.urlsplit(base_url)
    host = (parsed.hostname or "").lower()
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise SafetyError("base URL may contain only scheme, host, port, and optional base path")
    if mode == "local":
        loopback = host in {"127.0.0.1", "localhost", "::1"}
        if not loopback and not (isolated_preview and host in {h.lower() for h in allow_hosts}):
            raise SafetyError("local mode accepts loopback, or an explicitly allowlisted isolated preview")
        if parsed.scheme not in ({"http", "https"} if loopback else {"https"}):
            raise SafetyError("invalid local/preview URL scheme")
        return
    if mode != "production-smoke":
        raise SafetyError("unknown execution mode")
    production = inventory["production"]
    if opt_in != production["opt_in_phrase"]:
        raise SafetyError("production smoke audit requires the exact opt-in phrase")
    if parsed.scheme != "https" or host != production["host"].lower():
        raise SafetyError("production smoke base URL must be the configured HTTPS origin")


def select_targets(inventory, ids=None):
    wanted = set(ids or [])
    selected = [t for t in inventory["targets"] if not wanted or t["id"] in wanted]
    if wanted - {t["id"] for t in selected}:
        raise ValueError("unknown target ID(s): " + ", ".join(sorted(wanted - {t["id"] for t in selected})))
    return selected


def expand_template(value, env):
    if isinstance(value, dict):
        return {key: expand_template(item, env) for key, item in value.items()}
    if isinstance(value, list):
        return [expand_template(item, env) for item in value]
    if not isinstance(value, str):
        return value
    def replace(match):
        key = match.group(1)
        if not env.get(key):
            raise MissingFixture(key)
        return env[key]
    return PLACEHOLDER.sub(replace, value)


def redact(value, secrets=()):
    text = str(value)
    text = HEADER_SECRET.sub(lambda m: m.group(1) + ": [REDACTED]", text)
    text = JWT.sub("[REDACTED-JWT]", text)
    for secret in sorted({str(s) for s in secrets if s}, key=len, reverse=True):
        text = text.replace(secret, "[REDACTED]")
    return text


def _request_parts(target, base_url, env):
    local = expand_template(target["local"], env)
    path = local["path"]
    query = local.get("query", {})
    url = urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
    if query:
        url += "?" + urllib.parse.urlencode(query)
    return local, url


def build_sqlmap_command(target, base_url, sqlmap_path, defaults, env):
    local, url = _request_parts(target, base_url, env)
    technique = local.get("technique", "BEU")
    command = [sys.executable, str(sqlmap_path), "-u", url, "--batch", "--level=1", "--risk=1",
               "--threads=1", "--technique=" + technique, "--dbms=PostgreSQL", "--union-cols=1-10", "--flush-session",
               "--delay=" + str(defaults.get("delay", 1.0)),
               "--timeout=" + str(defaults.get("timeout", 15)),
               "--retries=" + str(defaults.get("retries", 1))]
    method = target["method"].upper()
    headers = ["Accept-Encoding: identity"]
    if method != "GET":
        command.append("--method=" + method)
        origin = urllib.parse.urlsplit(base_url)
        origin_value = f"{origin.scheme}://{origin.netloc}"
        headers.extend(["Origin: " + origin_value, "Sec-Fetch-Site: same-origin"])
    if local.get("json") is not None:
        command.extend(["--data=" + json.dumps(local["json"], separators=(",", ":")),
                        ])
        headers.append("Content-Type: application/json")
    if local.get("form") is not None:
        command.append("--data=" + urllib.parse.urlencode(local["form"]))
        headers.append("Content-Type: application/x-www-form-urlencoded")
    if local.get("inject") and local["inject"] != "*":
        command.extend(["-p", local["inject"]])
    auth = target.get("auth", {})
    if isinstance(auth, dict) and auth.get("env"):
        cookie = expand_template("${" + auth["env"] + "}", env)
        command.append("--cookie=" + cookie)
    command.append("--headers=" + "\n".join(headers))
    return command


def classify_sqlmap_output(output, returncode, timed_out=False):
    lower = output.lower()
    if timed_out:
        return {"status": "timeout", "detail": "per-target deadline exceeded"}
    if "false positive or unexploitable" in lower:
        return {"status": "false_positive", "detail": "SQLMap rejected its preliminary signal"}
    if "all tested parameters do not appear to be injectable" in lower or "does not seem to be injectable" in lower:
        return {"status": "not_injectable", "detail": "SQLMap found no injectable parameter"}
    if "page content is not stable" in lower or "target url content is not stable" in lower:
        return {"status": "unstable_response", "detail": "dynamic response prevented a reliable comparison"}
    if "waf/ips" in lower or "web application firewall" in lower or "too many requests" in lower:
        return {"status": "waf_or_rate_limited", "detail": "scanner observed WAF or rate limiting"}
    if "identified the following injection point" in lower or "appears to be injectable" in lower:
        return {"status": "suspected", "detail": "scanner signal requires manual and source confirmation"}
    if returncode != 0:
        return {"status": "error", "detail": "SQLMap exited with code %s" % returncode}
    return {"status": "inconclusive", "detail": "no definitive scanner conclusion"}


def _default_executor(command, timeout):
    completed = subprocess.run(command, capture_output=True, text=True, timeout=timeout, check=False)
    return completed.returncode, completed.stdout + "\n" + completed.stderr


def _default_transport(url, timeout):
    request = urllib.request.Request(url, headers={"Accept-Encoding": "identity", "User-Agent": "GGMarket-Security-Smoke/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return response.status, dict(response.headers), response.read(262144), response.geturl()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read(262144), error.geturl()


class AuditRunner:
    def __init__(self, inventory, executor=None, transport=None, sleeper=None, log_dir=None, secrets=()):
        self.inventory = inventory
        self.executor = executor or _default_executor
        self.transport = transport or _default_transport
        self.sleeper = sleeper or time.sleep
        self.cancelled = False
        self.log_dir = Path(log_dir) if log_dir else None
        self.secrets = tuple(secrets)
        self.run_id = f"{os.getpid()}-{int(time.time() * 1000)}"

    def cancel(self, *_):
        self.cancelled = True

    @staticmethod
    def _base_result(target):
        return {"id": target["id"], "route": target["route"], "method": target["method"],
                "parameters": target.get("parameters", []), "sources": target.get("sources", [])}

    def _write_log(self, target_id, output):
        if not self.log_dir:
            return
        if isinstance(output, bytes):
            output = output.decode("utf-8", errors="replace")
        self.log_dir.mkdir(parents=True, exist_ok=True)
        (self.log_dir / (target_id + ".log")).write_text(
            redact(output or "", self.secrets) + "\n", encoding="utf-8")

    def run_local(self, targets, base_url, sqlmap_path, env, stop_on_timeout=False):
        results = []
        defaults = self.inventory["defaults"]
        for target in targets:
            if self.cancelled:
                break
            result = self._base_result(target)
            if not target.get("local", {}).get("enabled"):
                result.update(status="not_run", detail="static/manual target")
                results.append(result)
                continue
            try:
                command = build_sqlmap_command(target, base_url, sqlmap_path, defaults, env)
                if self.log_dir:
                    session_dir = self.log_dir.parent / "sessions" / self.run_id / target["id"]
                    command.append("--output-dir=" + str(session_dir))
                code, output = self.executor(command, int(defaults.get("per_target_seconds", 180)))
                self._write_log(target["id"], output)
                result.update(classify_sqlmap_output(output, code))
            except MissingFixture as error:
                result.update(status="blocked_fixture", detail="missing environment fixture: " + str(error))
            except (TimeoutError, subprocess.TimeoutExpired) as error:
                partial = ""
                if isinstance(error, subprocess.TimeoutExpired):
                    partial_stdout = error.stdout or error.output or ""
                    partial_stderr = error.stderr or ""
                    if isinstance(partial_stdout, bytes):
                        partial_stdout = partial_stdout.decode("utf-8", errors="replace")
                    if isinstance(partial_stderr, bytes):
                        partial_stderr = partial_stderr.decode("utf-8", errors="replace")
                    partial = str(partial_stdout) + "\n" + str(partial_stderr)
                self._write_log(target["id"], partial)
                result.update(classify_sqlmap_output("", -1, timed_out=True))
                results.append(result)
                if stop_on_timeout:
                    break
                continue
            except KeyboardInterrupt:
                self.cancelled = True
                result.update(status="cancelled", detail="operator cancelled")
            except Exception as error:
                result.update(status="error", detail=str(error))
            results.append(result)
            if result["status"] == "suspected":
                break
            self.sleeper(float(defaults.get("delay", 1.0)))
        return results

    def run_production_smoke(self, targets, base_url, budget):
        results, used = [], 0
        allowed_paths = set(self.inventory["production"]["allowed_paths"])
        expected_origin = urllib.parse.urlsplit(base_url)
        for target in targets:
            if self.cancelled or used >= budget:
                break
            result = self._base_result(target)
            prod = target.get("production", {})
            path = prod.get("path")
            if target["method"] != "GET" or not prod.get("allowed") or path not in allowed_paths:
                result.update(status="blocked_safety", detail="not an approved production GET path")
                results.append(result)
                continue
            query = prod.get("query", {})
            url = urllib.parse.urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
            if query:
                url += "?" + urllib.parse.urlencode(query)
            status, headers, body, final_url = self.transport(url, self.inventory["defaults"].get("timeout", 15))
            used += 1
            final = urllib.parse.urlsplit(final_url)
            if (final.scheme, final.hostname, final.port) != (expected_origin.scheme, expected_origin.hostname, expected_origin.port):
                result.update(status="blocked_redirect", detail="redirect left the approved origin")
            elif status in (403, 429):
                result.update(status="waf_or_rate_limited", detail="HTTP %d; audit stopped" % status)
            elif status >= 500:
                result.update(status="http_error", detail="HTTP %d; audit stopped" % status)
            elif status >= 400:
                result.update(status="http_error", detail="HTTP %d" % status)
            else:
                result.update(status="smoke_ok", detail="bounded read-only response HTTP %d" % status)
            results.append(result)
            if result["status"] in {"blocked_redirect", "waf_or_rate_limited", "http_error"}:
                break
            self.sleeper(float(self.inventory["defaults"].get("delay", 1.0)))
        return results


def write_reports(results, inventory, reports_dir, secrets=()):
    directory = Path(reports_dir)
    directory.mkdir(parents=True, exist_ok=True)
    safe_results = json.loads(redact(json.dumps(results), secrets))
    totals = Counter(item["status"] for item in safe_results)
    discovered = len(inventory["targets"])
    testable = sum(bool(t.get("local", {}).get("enabled")) for t in inventory["targets"])
    total_parameters = sum(len(t.get("parameters", [])) for t in inventory["targets"])
    tested_parameters = sum(len(item.get("parameters", [])) for item in safe_results if item["status"] not in {"not_run", "blocked_fixture", "blocked_safety"})
    payload = {"schema_version": 1, "generated_by": "security/sqlmap/runner.py",
               "discovered_entry_points": discovered, "automatable_local_targets": testable,
               "parameter_coverage": {"inventoried": total_parameters, "tested_this_run": tested_parameters,
                                      "untested_this_run": total_parameters - tested_parameters},
               "totals": dict(sorted(totals.items())), "results": safe_results,
               "confirmed_vulnerabilities": [],
               "source_review": inventory.get("source_review", {})}
    json_path = directory / "summary.json"
    json_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    csv_path = directory / "summary.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["id", "method", "route", "parameters", "status", "detail", "sources"])
        for item in safe_results:
            writer.writerow([item["id"], item["method"], item["route"], ";".join(item.get("parameters", [])),
                             item["status"], item.get("detail", ""), ";".join(item.get("sources", []))])
    md_path = directory / "SECURITY_REPORT.md"
    lines = ["# GGMarket SQL Injection Security Report", "", "## Scope and conclusion", "",
             f"- Database-connected entry points inventoried: **{discovered}**",
             f"- Locally automatable targets: **{testable}**",
             f"- User-controlled parameter groups inventoried: **{total_parameters}**",
             f"- Parameter groups tested in this report generation run: **{tested_parameters}**",
             "- Confirmed SQL injection vulnerabilities: **0**",
             "- Production requests made while generating this baseline: **0**",
             "", "Scanner output is never sufficient for confirmation. A finding remains suspected until reproduced and matched to a source-level SQL sink.",
             "", "## Result totals", ""]
    lines.extend(f"- {key}: **{value}**" for key, value in sorted(totals.items()))
    lines.extend(["", "## Results", "", "| Target | Method | Route | Status | Evidence |", "|---|---|---|---|---|"])
    for item in safe_results:
        detail = item.get("detail", "").replace("|", "\\|").replace("\n", " ")
        lines.append(f"| `{item['id']}` | {item['method']} | `{item['route']}` | {item['status']} | {detail} |")
    lines.extend(["", "## Source review", "", inventory.get("source_review", {}).get("conclusion", "Not recorded."),
                  "", "### Prior bounded evidence", ""])
    lines.extend("- " + item for item in inventory.get("source_review", {}).get("previous_local_evidence", []))
    lines.extend(["", "The earlier live `/marketplace?q=ps5` operator scan concluded false positive or unexploitable; it was not repeated by this implementation.",
                  "", "## Remaining coverage", "",
                  "Authenticated and mutation-capable routes require disposable local accounts and fixture IDs. Static-only database functions require manual source review; absence of an automated result is not a pass.",
                  "", "## Safety", "",
                  "Production mode is explicit opt-in, HTTPS, exact-host, exact-path, GET-only, and request-budgeted. It does not invoke SQLMap.", ""])
    md_path.write_text(redact("\n".join(lines), secrets), encoding="utf-8")
    return {"json": json_path, "csv": csv_path, "markdown": md_path}


def _find_sqlmap(inventory, explicit=None):
    candidates = [explicit, os.environ.get("SQLMAP_PATH"), *inventory.get("sqlmap_candidates", [])]
    for candidate in candidates:
        if candidate and Path(candidate).is_file():
            return str(Path(candidate))
    raise FileNotFoundError("SQLMap not found; use --sqlmap-path or SQLMAP_PATH")


def main(argv=None):
    root = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", default=str(root / "targets.json"))
    parser.add_argument("--mode", choices=["local", "production-smoke"], default="local")
    parser.add_argument("--base-url", default="http://127.0.0.1:3000")
    parser.add_argument("--target", action="append")
    parser.add_argument("--sqlmap-path")
    parser.add_argument("--validate-only", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--isolated-preview", action="store_true")
    parser.add_argument("--allow-host", action="append", default=[])
    parser.add_argument("--production-opt-in")
    parser.add_argument("--request-budget", type=int, default=12)
    parser.add_argument("--reports-dir", default=str(root / "reports"))
    args = parser.parse_args(argv)
    inventory = load_inventory(args.inventory)
    validate_execution(args.mode, args.base_url, inventory, args.production_opt_in,
                       args.isolated_preview, args.allow_host)
    targets = select_targets(inventory, args.target)
    if args.validate_only or args.dry_run:
        results = []
        for target in targets:
            result = AuditRunner._base_result(target)
            status = "not_run"
            detail = "inventory validated; no network or subprocess execution"
            if args.dry_run and target.get("local", {}).get("enabled"):
                try:
                    build_sqlmap_command(target, args.base_url, "sqlmap.py", inventory["defaults"], os.environ)
                    detail = "command template validated; not executed"
                except MissingFixture as error:
                    status, detail = "blocked_fixture", "missing environment fixture: " + str(error)
            result.update(status=status, detail=detail)
            results.append(result)
    else:
        secret_values = [value for key, value in os.environ.items() if any(s in key for s in ("TOKEN", "COOKIE", "KEY", "SECRET"))]
        audit = AuditRunner(inventory, log_dir=Path(args.reports_dir) / "logs", secrets=secret_values)
        signal.signal(signal.SIGINT, audit.cancel)
        if args.mode == "production-smoke":
            results = audit.run_production_smoke(targets, args.base_url, min(args.request_budget, inventory["production"]["max_request_budget"]))
        else:
            sqlmap_path = _find_sqlmap(inventory, args.sqlmap_path)
            results = audit.run_local(targets, args.base_url, sqlmap_path, os.environ)
    write_reports(results, inventory, args.reports_dir, secrets=[value for key, value in os.environ.items() if any(s in key for s in ("TOKEN", "COOKIE", "KEY", "SECRET"))])
    severe = {"suspected", "error", "timeout", "http_error", "blocked_redirect", "waf_or_rate_limited"}
    return 2 if any(r["status"] in severe for r in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
