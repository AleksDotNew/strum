---
name: strudel-reference
description: >-
  Search and inspect Strudel API functions, parameters, mini-notation syntax,
  and sample/synth registration rules from local doc.json or upstream Strudel
  repository. Use when implementing engine wrappers, autocomplete catalogs,
  parameter ranges, or debugging Strudel evaluation.
---

# Strudel Reference & Mini-Notation Lookup (`strudel-reference`)

## Overview
Queries Strudel's JSDoc function catalog (`doc.json` from `node_modules/@strudel/*` or upstream GitHub with local caching) and provides an offline reference for Strudel mini-notation operators and prebake conventions.

## Dependencies
- **uv**: Optional Python runner when `uv` is installed; falls back cleanly to `python3` stdlib.

## Quick Start
```bash
python3 .agents/skills/strudel-reference/scripts/strudel_docs.py mini --output tmp/strudel-mini.json
```

## Utility Scripts

### 1. Search functions (`search`)
Searches Strudel function names and descriptions (`--limit` is required).
```bash
python3 .agents/skills/strudel-reference/scripts/strudel_docs.py search --query lpf --limit 10 --output tmp/strudel-search.json
```

### 2. Function details (`fn`)
Returns full signature, parameters, description, and examples for a function.
```bash
python3 .agents/skills/strudel-reference/scripts/strudel_docs.py fn --name lpf --output tmp/strudel-fn.json
```

### 3. Mini-notation operator table (`mini`)
Writes the complete mini-notation operator reference (and grid-representability flags used by `src/code-model/`) to `--output`. Also see [mini-notation.md](./references/mini-notation.md).
```bash
python3 .agents/skills/strudel-reference/scripts/strudel_docs.py mini --output tmp/strudel-mini.json
```

## Rate Limiting
When local `doc.json` is not yet installed in `node_modules` and `--allow-network true` is passed, upstream requests to `raw.githubusercontent.com` enforce a cross-process file lock (`/tmp/strum_github_ratelimit.lock`) with `time.monotonic()` at **1 request/second**, exponential backoff on HTTP 5xx, and `RateLimitError` on HTTP 429.

## Common Mistakes
- **Guessing Strudel export names**: Always inspect `node_modules/@strudel/*` or run `search` / `fn` before wiring REPL or audio functions.
- **Treating single-quoted strings as mini-notation**: In Strudel transpiler, `"..."` and `` `...` `` are transpiled as mini-notation (`m(...)`), whereas `'...'` remains a plain JS string (e.g., `samples('github:...')`).

