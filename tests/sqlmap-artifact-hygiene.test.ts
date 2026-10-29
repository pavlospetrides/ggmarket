import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const git = (...args: string[]) => spawnSync("git", args, {
  cwd: new URL("..", import.meta.url),
  encoding: "utf8",
});

describe("SQLMap artifact hygiene", () => {
  it.each([
    "security/sqlmap/reports/sessions/example/target.txt",
    "security/sqlmap/reports/sessions/example/session.sqlite",
    "security/sqlmap/__pycache__/runner.cpython-313.pyc",
    ".playwright-cli/page-snapshot.yml",
  ])("ignores sensitive generated artifact %s", (path) => {
    expect(git("check-ignore", "--quiet", "--no-index", "--", path).status).toBe(0);
  });

  it.each([
    "security/sqlmap/reports/summary.json",
    "security/sqlmap/reports/summary.csv",
    "security/sqlmap/reports/SECURITY_REPORT.md",
  ])("keeps sanitized report %s eligible for version control", (path) => {
    expect(git("check-ignore", "--quiet", "--no-index", "--", path).status).toBe(1);
  });

  it("does not track raw SQLMap session files", () => {
    const result = git("ls-files", "--", "security/sqlmap/reports/sessions/**");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("");
  });

  it("does not track generated browser snapshots", () => {
    const result = git("ls-files", "--", ".playwright-cli/**");
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("");
  });
});
