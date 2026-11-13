import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";

describe("profile media cleanup operator command", () => {
  it("shows credential-free help and refuses an unapproved apply", () => {
    const command = "scripts/retry-profile-media-cleanup.mjs";
    const help = execFileSync(process.execPath, [command, "--help"], { encoding: "utf8" });
    expect(help).toContain("Dry-run by default");
    expect(help).toContain("--confirm-r2-bucket");
    expect(() => execFileSync(process.execPath, [command, "--apply"], { env: { NODE_ENV: "test" }, stdio: "pipe" })).toThrow();
  });
});
