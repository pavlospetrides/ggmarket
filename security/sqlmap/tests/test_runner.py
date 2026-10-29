import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("gg_sqlmap_runner", ROOT / "runner.py")
runner = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(runner)


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.inventory = runner.load_inventory(ROOT / "targets.json")

    def test_inventory_is_versioned_and_has_unique_targets(self):
        self.assertEqual(self.inventory["schema_version"], 1)
        ids = [target["id"] for target in self.inventory["targets"]]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertGreaterEqual(len(ids), 25)

    def test_local_defaults_to_loopback_and_preview_requires_opt_in(self):
        runner.validate_execution("local", "http://127.0.0.1:3000", self.inventory)
        with self.assertRaises(runner.SafetyError):
            runner.validate_execution("local", "https://preview.example.test", self.inventory)
        runner.validate_execution(
            "local", "https://preview.example.test", self.inventory,
            isolated_preview=True, allow_hosts=["preview.example.test"]
        )

    def test_production_requires_exact_opt_in_https_host_and_get_allowlist(self):
        phrase = self.inventory["production"]["opt_in_phrase"]
        with self.assertRaises(runner.SafetyError):
            runner.validate_execution("production-smoke", "https://ggmarket.eu", self.inventory)
        with self.assertRaises(runner.SafetyError):
            runner.validate_execution("production-smoke", "http://ggmarket.eu", self.inventory, opt_in=phrase)
        with self.assertRaises(runner.SafetyError):
            runner.validate_execution("production-smoke", "https://evil.example", self.inventory, opt_in=phrase)
        runner.validate_execution("production-smoke", "https://ggmarket.eu", self.inventory, opt_in=phrase)

    def test_template_expansion_blocks_missing_fixture(self):
        self.assertEqual(runner.expand_template("${FIXTURE_ID}", {"FIXTURE_ID": "abc"}), "abc")
        with self.assertRaises(runner.MissingFixture):
            runner.expand_template("${MISSING_SECRET}", {})

    def test_redaction_removes_credentials_and_jwts(self):
        secret = "secret-cookie-value"
        text = "Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.abc.sig\nCookie: sb-access-token=%s\napikey: key123" % secret
        clean = runner.redact(text, [secret, "key123"])
        self.assertNotIn(secret, clean)
        self.assertNotIn("key123", clean)
        self.assertNotIn("eyJhbGci", clean)
        self.assertIn("[REDACTED]", clean)

    def test_sqlmap_command_is_conservative(self):
        target = next(t for t in self.inventory["targets"] if t["id"] == "page-marketplace-search")
        command = runner.build_sqlmap_command(target, "http://127.0.0.1:3000", "sqlmap.py", self.inventory["defaults"], {})
        joined = " ".join(command)
        for expected in ("--batch", "--level=1", "--risk=1", "--threads=1", "--technique=BEU", "--dbms=PostgreSQL", "--union-cols=1-10", "Accept-Encoding: identity"):
            self.assertIn(expected, joined)
        for forbidden in ("--dump", "--os-shell", "--sql-shell", "--file-write", "--priv-esc"):
            self.assertNotIn(forbidden, joined)

    def test_uri_targets_use_an_explicit_marker_without_fake_parameter(self):
        target = next(t for t in self.inventory["targets"] if t["id"] == "page-listing-detail")
        command = runner.build_sqlmap_command(
            target,
            "http://127.0.0.1:3000",
            "sqlmap.py",
            self.inventory["defaults"],
            {"FIXTURE_LISTING_ID": "00000000-0000-0000-0000-000000000101"},
        )
        self.assertIn("00000000-0000-0000-0000-000000000101*", command[command.index("-u") + 1])
        self.assertNotIn("-p", command)

    def test_dynamic_profile_target_uses_bounded_boolean_and_error_techniques(self):
        target = next(t for t in self.inventory["targets"] if t["id"] == "page-public-profile")
        command = runner.build_sqlmap_command(
            target,
            "http://127.0.0.1:3000",
            "sqlmap.py",
            self.inventory["defaults"],
            {"FIXTURE_USERNAME_A": "sqlmap_user_a"},
        )
        self.assertIn("--technique=BE", command)
        self.assertNotIn("--technique=BEU", command)

    def test_mutation_templates_match_current_route_schemas(self):
        saved = next(t for t in self.inventory["targets"] if t["id"] == "api-saved-searches-create")
        message = next(t for t in self.inventory["targets"] if t["id"] == "api-messages-post")
        trade = next(t for t in self.inventory["targets"] if t["id"] == "api-trades-create")
        self.assertIn("searchTerm", saved["local"]["json"])
        self.assertNotIn("query", saved["local"]["json"])
        self.assertRegex(message["local"]["json"]["clientId"], r"^[0-9a-f-]{36}$")
        self.assertIn("cashAdjustment", trade["local"]["json"])
        verification = next(t for t in self.inventory["targets"] if t["id"] == "api-item-verification")
        self.assertEqual(verification["local"]["json"]["listingId"], "${FIXTURE_LISTING_ID_A}")

    def test_mutation_commands_preserve_same_origin_csrf_headers(self):
        target = next(t for t in self.inventory["targets"] if t["id"] == "api-recently-viewed")
        command = runner.build_sqlmap_command(
            target,
            "http://127.0.0.1:3000",
            "sqlmap.py",
            self.inventory["defaults"],
            {
                "FIXTURE_LISTING_ID": "00000000-0000-0000-0000-000000000101",
                "GGMARKET_TEST_COOKIE_A": "synthetic=cookie",
            },
        )
        joined = "\n".join(command)
        self.assertIn("Origin: http://127.0.0.1:3000", joined)
        self.assertIn("Sec-Fetch-Site: same-origin", joined)

    def test_false_positive_is_not_confirmed(self):
        output = "parameter might be injectable\nfalse positive or unexploitable injection point detected"
        self.assertEqual(runner.classify_sqlmap_output(output, 0)["status"], "false_positive")
        self.assertEqual(runner.classify_sqlmap_output("all tested parameters do not appear to be injectable", 0)["status"], "not_injectable")
        self.assertEqual(runner.classify_sqlmap_output("identified the following injection point", 0)["status"], "suspected")
        self.assertNotEqual(runner.classify_sqlmap_output("identified the following injection point", 0)["status"], "confirmed")
        self.assertEqual(runner.classify_sqlmap_output("page content is not stable", 0)["status"], "unstable_response")
        completed = "target is protected by some kind of WAF/IPS\ntarget URL content is not stable\nall tested parameters do not appear to be injectable"
        self.assertEqual(runner.classify_sqlmap_output(completed, 0)["status"], "not_injectable")

    def test_executor_is_sequential_and_stops_after_timeout(self):
        calls = []
        def execute(command, timeout):
            calls.append(command)
            if len(calls) == 2:
                raise TimeoutError("deadline")
            return 0, "all tested parameters do not appear to be injectable"
        targets = [t for t in self.inventory["targets"] if t.get("local", {}).get("enabled")][:3]
        audit = runner.AuditRunner(self.inventory, executor=execute, sleeper=lambda _: None)
        results = audit.run_local(targets, "http://127.0.0.1:3000", "sqlmap.py", {}, stop_on_timeout=True)
        self.assertEqual([r["status"] for r in results], ["not_injectable", "timeout"])
        self.assertEqual(len(calls), 2)

    def test_each_target_uses_an_isolated_sqlmap_output_directory(self):
        calls = []
        def execute(command, timeout):
            calls.append(command)
            return 0, "all tested parameters do not appear to be injectable"
        target = next(t for t in self.inventory["targets"] if t["id"] == "page-search")
        with tempfile.TemporaryDirectory() as directory:
            audit = runner.AuditRunner(self.inventory, executor=execute, sleeper=lambda _: None,
                                       log_dir=Path(directory, "logs"))
            audit.run_local([target], "http://127.0.0.1:3000", "sqlmap.py", {})
            output_args = [arg for arg in calls[0] if arg.startswith("--output-dir=")]
            self.assertEqual(len(output_args), 1)
            self.assertIn("page-search", output_args[0])

    def test_per_target_logs_are_separate_and_redacted(self):
        secret = "synthetic-cookie-secret"
        def execute(command, timeout):
            return 0, "Cookie: " + secret + "\nall tested parameters do not appear to be injectable"
        target = next(t for t in self.inventory["targets"] if t["id"] == "page-search")
        with tempfile.TemporaryDirectory() as directory:
            audit = runner.AuditRunner(self.inventory, executor=execute, sleeper=lambda _: None,
                                       log_dir=Path(directory), secrets=[secret])
            audit.run_local([target], "http://127.0.0.1:3000", "sqlmap.py", {})
            log = Path(directory, "page-search.log").read_text(encoding="utf-8")
            self.assertNotIn(secret, log)
            self.assertIn("[REDACTED]", log)

    def test_timeout_retains_partial_stdout_and_stderr_in_redacted_log(self):
        secret = "timeout-cookie-secret"
        def execute(command, timeout):
            raise runner.subprocess.TimeoutExpired(
                command,
                timeout,
                output="partial stdout Cookie: " + secret,
                stderr="partial stderr page content is stable",
            )
        target = next(t for t in self.inventory["targets"] if t["id"] == "page-search")
        with tempfile.TemporaryDirectory() as directory:
            audit = runner.AuditRunner(self.inventory, executor=execute, sleeper=lambda _: None,
                                       log_dir=Path(directory), secrets=[secret])
            results = audit.run_local([target], "http://127.0.0.1:3000", "sqlmap.py", {})
            log = Path(directory, "page-search.log").read_text(encoding="utf-8")
            self.assertEqual(results[0]["status"], "timeout")
            self.assertIn("partial stdout", log)
            self.assertIn("partial stderr", log)
            self.assertNotIn(secret, log)

    def test_production_probe_enforces_budget_and_stops_on_server_error(self):
        calls = []
        def transport(url, timeout):
            calls.append(url)
            return 500, {}, b"error", url
        audit = runner.AuditRunner(self.inventory, transport=transport, sleeper=lambda _: None)
        targets = [t for t in self.inventory["targets"] if t.get("production", {}).get("allowed")]
        results = audit.run_production_smoke(targets, "https://ggmarket.eu", budget=1)
        self.assertEqual(len(calls), 1)
        self.assertEqual(results[0]["status"], "http_error")

    def test_reports_are_deterministic_and_secret_free(self):
        results = [{"id": "x", "route": "/x", "method": "GET", "parameters": ["q"],
                    "status": "not_injectable", "detail": "Cookie: secret-value", "sources": ["app/x.ts:1"]}]
        with tempfile.TemporaryDirectory() as directory:
            paths = runner.write_reports(results, self.inventory, Path(directory), secrets=["secret-value"])
            payload = json.loads(paths["json"].read_text(encoding="utf-8"))
            self.assertEqual(payload["totals"]["not_injectable"], 1)
            for path in paths.values():
                self.assertNotIn("secret-value", path.read_text(encoding="utf-8"))
            self.assertIn("SQL Injection Security Report", paths["markdown"].read_text(encoding="utf-8"))


if __name__ == "__main__":
    unittest.main()
