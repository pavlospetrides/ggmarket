#!/usr/bin/env node
// A credential-free build gate. The fixture supplies no marketplace records;
// it verifies compilation/prerendering, not real Supabase or R2 integration.
import { createServer } from "node:http";
import { spawn } from "node:child_process";

const server = createServer((request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Content-Range", "*/0");
  response.end(request.method === "HEAD" ? undefined : "[]");
});
await new Promise((resolve) => server.listen(54391, "127.0.0.1", resolve));
console.log("Build uses a local empty Supabase API fixture; no cloud credentials or cloud requests.");
const child = spawn("npm run build", {
  shell: true,
  stdio: "inherit",
  env: {
    ...process.env,
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54391",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "local-build-fixture",
    MEDIA_STORAGE_PROVIDER: "supabase",
    R2_ACCESS_KEY_ID: "R2_BUILD_SECRET_SENTINEL_ACCESS",
    R2_SECRET_ACCESS_KEY: "R2_BUILD_SECRET_SENTINEL_PRIVATE",
  },
});
child.on("exit", (code) => { server.close(); process.exitCode = code ?? 1; });
