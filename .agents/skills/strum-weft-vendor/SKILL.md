---
name: strum-weft-vendor
description: >-
  Vendor a specific source file from alaca/weft-loom into src/vendor/weft/ with
  an AGPL-3.0-or-later attribution header, pinned commit SHA, and updated
  VENDORED.json manifest. Use when borrowing engine prebake, control catalogs,
  or AST helpers from Weft Loom.
---

# Weft Loom Vendoring Tool (`strum-weft-vendor`)

## Overview
Downloads individual modules from `alaca/weft-loom` at a pinned commit SHA (`3fdda763e3c99a576b9ba92c0e58750ed135d8f7`), prepends an explicit `AGPL-3.0-or-later` provenance header, records the entry in `src/vendor/weft/VENDORED.json`, and writes a JSON operation report.

## Dependencies
- **uv**: Optional Python runner; works with standard `python3`.

## Quick Start
```bash
python3 .agents/skills/strum-weft-vendor/scripts/vendor.py inspect --project-dir . --output tmp/vendor-manifest.json
```

## Utility Scripts

### 1. Fetch and vendor a file from Weft Loom (`fetch`)
Downloads `--remote-path` at `--sha`, prepends the AGPL attribution header, writes to `src/vendor/weft/<dest>`, updates `src/vendor/weft/VENDORED.json`, and writes the status report to `--output`.
```bash
python3 .agents/skills/strum-weft-vendor/scripts/vendor.py fetch \
  --remote-path src/controls/catalog.ts \
  --sha 3fdda763e3c99a576b9ba92c0e58750ed135d8f7 \
  --dest catalog.ts \
  --output tmp/vendor-catalog.json
```

### 2. Inspect vendored files (`inspect`)
Verifies that all files in `src/vendor/weft/` have valid attribution headers and match `VENDORED.json`.
```bash
python3 .agents/skills/strum-weft-vendor/scripts/vendor.py inspect --project-dir . --output tmp/vendor-inspect.json
```

## Rate Limiting
Requests to `raw.githubusercontent.com` use a cross-process file lock (`/tmp/strum_weft_vendor_ratelimit.lock`) with `time.monotonic()` at **1 request/second**, exponential backoff on HTTP 5xx, and `RateLimitError` on HTTP 429.

## Common Mistakes
- **Copying code from Weft Loom without attribution**: Both Strudel and Weft Loom are `AGPL-3.0-or-later`. Always keep vendored code in `src/vendor/weft/` with the generated header.
- **Importing desktop-specific Tauri modules**: Strip or adapt `@tauri-apps/*` imports after vendoring and document the adaptation in the file header.
