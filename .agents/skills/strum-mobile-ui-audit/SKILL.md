---
name: strum-mobile-ui-audit
description: >-
  Audit Strum mobile UI against Google Pixel 9a constraints (412x915 dp
  viewport, no horizontal or vertical document overflow, user-scalable=no,
  touch targets >= 48px, and primary controls in the bottom 40% thumb zone).
  Use after creating or modifying any UI component or stylesheet.
---

# Strum Mobile UI Audit (`strum-mobile-ui-audit`)

## Overview
Verifies that Strum's mobile studio layout satisfies Pixel 9a ergonomics: locked viewport scaling (`user-scalable=no`), zero document scroll overflow on `412×915`, minimum `48×48` px touch targets, and bottom-zone placement for frequent controls.

## Dependencies
- **a11y-debugging**: Accessibility auditing for ARIA roles (`role="tablist"`, `role="tab"`, `aria-selected`), focus retention, and contrast.
- **chrome-devtools**: Live DOM and computed-style inspection when a visual check fails.

## Quick Start
```bash
python3 .agents/skills/strum-mobile-ui-audit/scripts/ui_audit.py static-check --project-dir . --output tmp/ui-static-audit.json
```

## Utility Scripts

### 1. Static HTML/CSS ergonomics check (`static-check`)
Verifies `index.html` viewport meta tags (`user-scalable=no`, `viewport-fit=cover`) and checks `src/styles/` for required mobile layout rules (`touch-action: manipulation`, `--kb` variable, `overflow: hidden`).
```bash
python3 .agents/skills/strum-mobile-ui-audit/scripts/ui_audit.py static-check --project-dir . --output tmp/ui-static-audit.json
```

### 2. Playwright layout e2e check (`layout-e2e`)
Runs `tests/e2e/layout.spec.ts` on the `412×915` Pixel viewport and writes the structured report to `--output`.
```bash
python3 .agents/skills/strum-mobile-ui-audit/scripts/ui_audit.py layout-e2e --project-dir . --output tmp/ui-e2e-audit.json
```

## Common Mistakes
- **Losing editor focus on SymbolBar tap**: Symbol buttons must call `e.preventDefault()` in `onPointerDown` so tapping a symbol does not blur CodeMirror or dismiss the Android IME.
- **Using `100vh` without `--kb`**: Always size `.app` with `calc(100dvh - var(--kb))` so the SymbolBar rides directly above the software keyboard.
