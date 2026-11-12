---
name: strum-code-model
description: >-
  Protocol for building and testing bidirectional AST controls in
  src/code-model/ (acorn parsing, literal location, surgical replaceLiteral
  rewriting, and graceful code-only fallback). Use whenever adding or modifying
  visual controls (sliders, step grid, piano roll, mixer gain/mute).
---

# Strum Bidirectional AST Code-Model Protocol (`strum-code-model`)

## Overview
Enforces Strum's core architectural rule: **Code is the single source of truth.** Visual controls (numeric sliders, drum step grids, piano rolls, and mixer strips) read Strudel code via `acorn` AST and rewrite only the targeted literal range via `replaceLiteral`.

## Dependencies
- **test-driven-development**: All `src/code-model/` functions must be written test-first with golden input/output cases and invariant assertions.
- **strum-check**: Run unit tests after every change.

## Quick Start
Read the golden test template in [golden-test-template.ts](./references/golden-test-template.ts) before adding any function to `src/code-model/`.

## Workflow

### 1. Check Module Purity
- Verify that files in `src/code-model/` do **not** import DOM APIs (`window`, `document`, `HTMLElement`), Solid.js, CodeMirror, or `@strudel/webaudio`.
- Allowed imports: `acorn`, `acorn-walk`, `@strudel/tonal` (pure pitch helpers only), and internal `src/code-model/*` modules.

### 2. Write Failing Golden & Invariant Tests
- Copy patterns from [golden-test-template.ts](./references/golden-test-template.ts) into `tests/unit/code-model.test.ts`.
- Every `replaceLiteral(code, literal, newText)` test MUST assert the **Byte-Range Preservation Invariant**:
  - `result.slice(0, literal.range[0]) === code.slice(0, literal.range[0])`
  - `result.slice(literal.range[0] + newText.length) === code.slice(literal.range[1])`
- Include a test verifying that if `newText` produces invalid JS syntax (fails `acorn.parse`), `replaceLiteral` throws or returns the original `code` unchanged.

### 3. Enforce Graceful `code-only` Fallback for Mini-Notation
- `miniToGrid(mini)` and `miniToNotes(mini)` MUST return `null` (never corrupt or lossily flatten the user's code) when the top-level mini-notation contains:
  - Alternation `<...>`
  - Polymeter `{...}`
  - Polyrhythm comma `,`
  - Euclidean `(k,n)`
  - Slow `/` or elongation `@` or probabilistic `?`
  - Nested brackets deeper than 1 level `[[...]]`

### 4. Verify Round-Trip Stability
- For every representable mini-notation string `s`, verify that `miniToGrid(gridToMini(miniToGrid(s)!))` equals `miniToGrid(s)`.

## Common Mistakes
- **Formatting the whole AST with a code generator (`escodegen` / `prettier`)**: Never regenerate the whole file—user comments, formatting, and unrelated `$:` blocks get destroyed. Always slice and replace only `[from, to]`.
- **Forgetting quotes when replacing mini-notation literals**: Decide explicitly whether `literal.range` includes or excludes the surrounding quotes (`"..."`) and keep that contract identical across `findLiterals`, `literalAt`, and `replaceLiteral`.

