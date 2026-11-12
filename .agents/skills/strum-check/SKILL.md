---
name: strum-check
description: >-
  Run the full verification suite for Strum (TypeScript typecheck, Vitest unit
  tests, Vite production build, and optional Playwright mobile e2e tests) and
  write a structured JSON report. Use before claiming any task is complete or
  committing changes.
---

# Strum Verification Suite (`strum-check`)

## Overview
Executes Strum's verification pipeline (`tsc --noEmit`, `vitest run`, `vite build`, and optionally `playwright test`) and writes structured results to a JSON file so the agent can inspect failures without flooding terminal context.

## Dependencies
- **verification-before-completion**: Enforces running verification and reading its output before claiming success.
- **test-driven-development**: Guides the red-green-refactor cycle verified by this skill.

## Quick Start
```bash
python3 .agents/skills/strum-check/scripts/check.py suite --e2e false --output tmp/check-report.json
```

## Utility Scripts

### 1. Run verification suite (`suite`)
Runs `typecheck`, `test` (Vitest), `build` (Vite), and optionally `test:e2e` (Playwright).
```bash
python3 .agents/skills/strum-check/scripts/check.py suite --e2e true --output tmp/check-report.json
```

### 2. Run a single test file (`single`)
Runs a single unit or e2e test file during TDD iterations.
```bash
python3 .agents/skills/strum-check/scripts/check.py single --test-file tests/unit/errors.test.ts --output tmp/test-single.json
```

## Common Mistakes
- **Claiming completion without running `suite`**: Always run `suite` and inspect the JSON report before committing.
- **Omitting `--output` or `--e2e`**: Both flags are required on `suite` so nothing is silently skipped.

