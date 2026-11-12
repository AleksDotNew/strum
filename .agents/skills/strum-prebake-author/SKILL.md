---
name: strum-prebake-author
description: >-
  Create, validate, and package custom Strudel prebake scripts (samples,
  aliasBank, register, custom synths) and Strum project template JSON bundles.
  Use when authoring built-in or user prebake scripts, testing prebake
  safety/trust rules, or exporting and importing templates.
---

# Strum Prebake & Template Authoring (`strum-prebake-author`)

## Overview
Helps design, validate, and bundle Strudel prebake scripts (`PrebakeScript`) and reusable project templates (`Template`). Audits scripts for registration calls (`samples`, `aliasBank`, `register`, `registerSound`, `setcps`) and flags untrusted network/DOM access so user-imported URLs require explicit trust confirmation (`trusted: boolean`).

## Dependencies
- **strudel-reference**: Provides function signatures for `samples()`, `aliasBank()`, and `register()`.
- **uv**: Optional Python runner; works with standard `python3`.

## Quick Start
```bash
python3 .agents/skills/strum-prebake-author/scripts/prebake_tool.py validate \
  --script-file .agents/skills/strum-prebake-author/references/example-prebake.strudel.js \
  --output tmp/prebake-validate.json
```

## Utility Scripts

### 1. Validate a prebake script (`validate`)
Analyzes a `.js` prebake script for balanced delimiters, extracts registered sample packs/synths/functions, and flags capabilities requiring user trust confirmation.
```bash
python3 .agents/skills/strum-prebake-author/scripts/prebake_tool.py validate \
  --script-file path/to/prebake.js \
  --output tmp/prebake-validate.json
```

### 2. Pack a project template bundle (`pack-template`)
Packages one or more prebake script files and an optional starter pattern into a single portable `.json` template bundle conforming to Strum's `TemplateBundle` schema.
```bash
python3 .agents/skills/strum-prebake-author/scripts/prebake_tool.py pack-template \
  --name "Techno 909 Starter" \
  --starter-code '$: s("bd*4 [~ cp] hh*8").bank("RolandTR909")' \
  --prebake-files path/to/prebake.js \
  --output tmp/techno-909.template.json
```

### 3. Inspect an exported template (`inspect-template`)
Validates a `.template.json` bundle against Strum's `Template` + embedded `PrebakeScript[]` schema.
```bash
python3 .agents/skills/strum-prebake-author/scripts/prebake_tool.py inspect-template \
  --template-file tmp/techno-909.template.json \
  --output tmp/template-inspect.json
```

## Common Mistakes
- **Auto-executing URL prebakes without trust**: Any script with `source: 'url' | 'file' | 'inline'` must start with `trusted: false` until the user previews the code and confirms; if a URL refresh changes `code`, `trusted` must reset to `false`.
- **Blocking user code when one prebake fails**: `runPrebake` must catch per-script errors into `PrebakeReport` and continue executing remaining scripts and the user's pattern.

