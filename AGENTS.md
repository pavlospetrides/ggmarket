<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GGMarket engineering policy

## Scope and precedence

- Read this file, the closest nested `AGENTS.md`, and any task-relevant repository documentation before acting. More specific nested instructions take precedence within their directory.
- Preserve the existing architecture, public behavior, design tokens, and unrelated working-tree changes. Do not commit, deploy, install dependencies, or alter production configuration unless the user explicitly requests it.
- Classify the task before choosing expertise and tools. Use the smallest workflow that gives reliable evidence; complex or cross-cutting work requires an approved plan.

## Expert routing

- **Architecture:** use `brainstorming`, then `writing-plans` for non-trivial work; apply `vercel-react-best-practices`; read the version-pinned guides in `node_modules/next/dist/docs/`; consult Context7 only when its tool is available in the current session.
- **Debugging:** use `systematic-debugging` to reproduce and identify root cause before changing code; use `test-driven-development` when a regression test is appropriate; finish with `verification-before-completion` and relevant logs or reproducible tests.
- **Frontend:** follow [DESIGN.md](./DESIGN.md) and existing tokens first; use `web-design-guidelines` for UX/accessibility review. Use 21st.dev only after a successful authenticated call, shadcn only when both its tool and project configuration are present, and `design-taste-frontend` selectively for public-facing design work.
- **Testing:** use Vitest for unit/integration tests and project `@playwright/test` for reproducible E2E. Use `playwright-cli` for exploration and Chrome DevTools MCP for diagnostics only when available; neither replaces committed regression coverage.
- **Security and data:** verify authorization boundaries, Supabase RLS, migration safety, secret handling, and test isolation. Follow [supabase/AGENTS.md](./supabase/AGENTS.md) for database work.
- **Code review:** use `requesting-code-review` and `verification-before-completion`; report evidence-backed findings by severity and distinguish verified facts from inference.

## Orchestration and tool truthfulness

- Apply Superpowers skills only when relevant. Keep simple tasks lightweight; plan complex work; establish root cause before fixes; run fresh verification before completion claims.
- Use subagents only when the user explicitly authorizes delegation and the current session exposes working multi-agent tools. Parallelize only independent tasks with non-overlapping write scopes. A skill installation alone does not enable delegation.
- Never claim an MCP or external tool was used unless its call succeeded in the current session. At the audit baseline: 21st.dev requires authentication, Figma requires OAuth, Chrome DevTools is configured but runtime-unverified, and Context7 plus shadcn were protocol-tested but still require per-session tool verification. Fall back to local code, version-pinned docs, repository tests, and Playwright as appropriate, and report the limitation.

## Repository protections

- Never expose Supabase service-role keys or other secrets, weaken RLS or authorization, run destructive SQL against production, replace real production data with mocks, or overwrite unrelated changes.
- Do not downgrade ESLint tooling to work around Next.js compatibility. Resolve versions using this repository's installed Next.js documentation and package constraints.
- Preserve all seven existing migration files. `supabase/migrations/202610030005_production_security_hardening.sql` is currently an untracked deployment blocker and must be reviewed and deliberately applied to the target environment before release.
- Do not claim builds, tests, MCP connectivity, deployment, or database state without fresh evidence. Follow [tests/e2e/AGENTS.md](./tests/e2e/AGENTS.md) for browser-test safety.
