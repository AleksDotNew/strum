# AGENTS.md — Strum Project Rules

Strum is an open-source (`AGPL-3.0-or-later`) Android mobile live-coding studio for Strudel, tailored for phone screens (target: Google Pixel 9a, 412×915 dp).

## 1. Global Constraints (Always Enforce)

- **License:** `AGPL-3.0-or-later`. Any file borrowed from `alaca/weft-loom` MUST live under `src/vendor/weft/`, include an attribution header with the pinned commit SHA (`3fdda763e3c99a576b9ba92c0e58750ed135d8f7`), and be listed in `src/vendor/weft/VENDORED.json`. Use the `strum-weft-vendor` skill.
- **Platform:** Android `minSdk = 29` (Android 10), `compileSdk = 36`, `targetSdk = 36`, JDK 21, `applicationId = "dev.strum.app"`, Capacitor 8.
- **Mobile Viewport & Ergonomics:**
  - Target viewport: `412×915` dp (portrait primary, 60/40 split in landscape).
  - Pinch-zoom is strictly disabled (`user-scalable=no`, `touch-action: manipulation`).
  - Document must NEVER overflow (`scrollWidth <= clientWidth`, `scrollHeight <= clientHeight`).
  - Interactive touch targets MUST be at least `48×48` CSS px.
  - Primary interactive controls (Play/Eval, SymbolBar, BottomNav) stay within the bottom 40% thumb zone or the fixed 48px top bar.
- **Code Is the Single Source of Truth:**
  - Visual controls (sliders, step grid, piano roll, mixer) NEVER store independent pattern state.
  - All code mutations from visual controls MUST go through `replaceLiteral(code, literal, newText)` in `src/code-model/`.
  - Every mutation MUST re-parse with `acorn` and roll back if syntax breaks.
- **Module Boundaries:**
  - `src/engine/` — Strudel REPL wrapper, audio context lifecycle, prebake execution, active hap highlighting.
  - `src/code-model/` — Pure functions (`acorn` AST parsing, literal location, surgical code rewriting, mini-notation ⇄ grid/notes). **NO DOM or Strudel runtime imports.**
  - `src/hints/` — Pure functions and catalog indexes (`doc.json` functions, `soundMap` sounds, mini-notation symbols, `@strudel/tonal` scales/notes, snippets). **NO DOM imports.**
  - `src/prebake/` — PrebakeScript stack, trust verification (`trusted: boolean`), and Project Template management.
  - `src/storage/` — IndexedDB (`idb`) repositories (`projects`, `versions`, `prebakes`, `templates`, `snippets`, `settings`) and Cache Storage for audio samples.
  - `src/editor/` — CodeMirror 6 configuration, cursor context detection, hap highlighting, literal tap handlers.
  - `src/ui/` — Solid.js screens, bottom sheets, SymbolBar, TopBar, BottomNav, keyboard inset handler (`--kb`).
  - `src/vendor/weft/` — Vendored files from Weft Loom with attribution headers.
- **TypeScript & Testing:**
  - `strict: true` in `tsconfig.json`.
  - Follow TDD (`test-driven-development`): write failing unit/e2e test → verify failure → implement minimal code → verify pass → commit.
  - Run `npm run check` (`typecheck && test && build`) before claiming any task is complete.

## 2. Project Skills & Slash Commands

Invoke these workspace skills (located in `.agents/skills/`) whenever relevant:
- `/strum-check` (`strum-check`) — Run typecheck, Vitest unit tests, Vite build, and optional Playwright e2e suite with structured JSON report.
- `/strum-android` (`strum-android`) — Check Android toolchain (JDK 21, SDK 36, AVD), build/sync Capacitor, capture screenshots, inspect WebView `logcat`.
- `/strum-mobile-ui-audit` (`strum-mobile-ui-audit`) — Verify 412×915 viewport geometry, >=48px touch targets, thumb zone placement, and no-scroll invariants.
- `/strudel-reference` (`strudel-reference`) — Query Strudel function signatures (`doc.json`), mini-notation operators, and prebake/sample registration rules.
- `/strum-code-model` (`strum-code-model`) — Follow the AST bidirectional control protocol and golden-test invariants.
- `/strum-weft-vendor` (`strum-weft-vendor`) — Vendor files from `alaca/weft-loom` with AGPL headers and SHA tracking.
- `/strum-prebake-author` (`strum-prebake-author`) — Validate custom prebake scripts, audit trust/security flags, and pack/inspect `.json` project templates.

## 3. Standard Commands

- `npm run dev` — Start Vite dev server on port `5180`.
- `npm test` — Run Vitest unit tests (`tests/unit/**/*.test.ts`).
- `npm run test:e2e` — Run Playwright mobile e2e tests (`tests/e2e/**/*.spec.ts`, viewport 412×915).
- `npm run typecheck` — Run `tsc --noEmit`.
- `npm run check` — Run `typecheck && test && build`.
- `npm run android` — Build web bundle, sync Capacitor Android, and launch on connected emulator/device.

## 4. Strudel API Notes

- Pin exact `@strudel/*` versions in `package.json` (`@strudel/core@1.2.6`, `@strudel/mini@1.2.6`, `@strudel/transpiler@1.2.6`, `@strudel/tonal@1.2.6`, `@strudel/draw@1.2.6`, `@strudel/webaudio@1.3.0`, `@strudel/soundfonts@1.3.0`, `@strudel/codemirror@1.3.0`).
- Always initialize `AudioContext` inside a user gesture handler (`pointerdown` / `click`) and call `ctx.resume()` if `ctx.state === 'suspended'`.
- Document any discovered export differences from `@strudel/*` packages here as phases progress.

