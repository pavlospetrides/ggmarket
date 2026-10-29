<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# GGMarket engineering policy

## Scope and precedence

- Read this file, the closest nested `AGENTS.md`, and any task-relevant repository documentation before acting. More specific nested instructions take precedence within their directory.
- Preserve the existing architecture, public behavior, design tokens, and unrelated working-tree changes. Do not commit, deploy, install dependencies, or alter production configuration unless the user explicitly requests it.
- Classify the task before choosing expertise and tools. Use the smallest workflow that gives reliable evidence; complex or cross-cutting work requires an approved plan.

## Usage-efficient execution

- Select only the skills, documentation, tools, and repository files relevant to the current task. Follow mandatory skill instructions, but do not invoke every Superpowers skill, reread unrelated guidance, or repeat brainstorming/planning for approved work.
- Before implementation, inspect the relevant current files and, when applicable, the existing plan and progress ledger. Resume from the current worktree state, trust recorded completed work, and avoid broad repository audits or repeated research without a concrete reason.
- Use external tools for a task-relevant purpose: 21st.dev for useful component research/integration, shadcn for appropriate UI primitives, Context7 for necessary documentation verification, Chrome DevTools for browser diagnostics, and Playwright for functional browser testing. Do not call MCP servers merely to demonstrate availability or repeat still-applicable searches.
- Subagents are off by default. Prefer inline execution for small and medium work; delegate only when authorized, when independent non-overlapping tasks justify the coordination cost, and when duplicate research or review will not result.
- Verify progressively: small changes get focused tests and relevant static checks; medium changes add targeted browser checks on affected routes; large or cross-cutting work uses focused checks during implementation and comprehensive regression, production-build, and required browser gates at major completion points. Responsive matrices are required when responsive behavior is affected, not by default for unrelated changes.
- Batch large work by objective and affected files, then implement, run focused verification, and record concise progress. Do not expand scope or create planning documents for minor changes without a concrete need.
- Efficiency never permits guessing instead of debugging, skipping security or necessary verification, ignoring failures, hiding errors, weakening Supabase authorization, removing required behavior, or claiming results without fresh evidence.

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
- Never claim an MCP or external tool was used unless its call succeeded in the current session. Chrome DevTools, shadcn, Context7, and 21st.dev have passed real tool executions historically; this does not prove availability or authentication in a future session. Figma authentication has been set up, but runtime availability still requires an active-session check. Fall back to local code, version-pinned docs, repository tests, and Playwright as appropriate, and report relevant limitations.

## Repository protections

- Never expose Supabase service-role keys or other secrets, weaken RLS or authorization, run destructive SQL against production, replace real production data with mocks, or overwrite unrelated changes.
- Do not downgrade ESLint tooling to work around Next.js compatibility. Resolve versions using this repository's installed Next.js documentation and package constraints.
- Preserve all seven existing migration files. The user confirmed `supabase/migrations/202610030005_production_security_hardening.sql` is present in Supabase migration history; review and track the local file and verify schema consistency, but do not automatically reapply it or claim release requires rerunning it without fresh evidence.
- Do not claim builds, tests, MCP connectivity, deployment, or database state without fresh evidence. Follow [tests/e2e/AGENTS.md](./tests/e2e/AGENTS.md) for browser-test safety.
