# End-to-end test policy

These rules apply under `tests/e2e/` in addition to the repository root instructions.

## Environment isolation

- E2E tests may create users and mutate Supabase-backed data. Run them only against a disposable test project or an explicitly approved isolated environment—never production or a shared environment containing valuable data.
- Verify the target before a run without printing secrets or full connection strings. If isolation cannot be established, do not run state-changing E2E tests; report the blocker.
- Keep service-role credentials in trusted test setup only. Never expose them to browser context, traces, screenshots, reports, fixtures, console output, or committed files.
- Create unique test records and clean them up deterministically, including on failure. Do not replace or reset unrelated data, and do not use production data as fixtures.

## Tool selection

- Project `@playwright/test` specs are the source of repeatable E2E evidence. Run the smallest relevant spec while iterating, then the required broader suite.
- Use `playwright-cli` for exploratory navigation, screenshots, and reproduction. Convert durable behavioral findings into project tests.
- Use Chrome DevTools MCP for runtime/network/performance diagnostics only after a successful tool call in the current session. Fall back to Playwright traces, screenshots, browser console output, and server logs when unavailable.
- Cover configured Chromium and WebKit projects where the affected behavior is cross-browser. Use Vitest instead when the behavior is a unit or integration concern that does not require a browser.

## Test quality

- Prefer user-visible roles, labels, and stable domain semantics over CSS selectors or implementation details. Avoid arbitrary sleeps; wait for observable states.
- Keep tests deterministic and independently runnable. Use explicit setup, bounded waits, and failure-safe cleanup. Respect repository worker/serialization constraints for shared backend state.
- Cover relevant viewport and interaction states, including mobile controls, keyboard use, loading, empty, error, authorization-denied, and success paths.
- Capture only the artifacts needed to diagnose failures and ensure they contain no credentials or sensitive user data.
- Do not weaken assertions to make a flaky test pass. Reproduce and diagnose the root cause with `systematic-debugging`, then add regression coverage when appropriate.

## Completion claims

- Use `verification-before-completion`. State the exact command, browser/project, environment class, and outcome for every claimed E2E result.
- Source inspection, exploratory browsing, or an MCP diagnostic is not proof that the project E2E suite passes. Do not claim tests ran unless the command was executed and its output was read.
