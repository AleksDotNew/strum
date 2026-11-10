# Strudel Mini-Notation & Transpiler Quick Reference

## String Quotes in Strudel Transpiler
- **Double quotes `"bd sd"` and backticks `` `bd sd` ``** are rewritten by `@strudel/transpiler` into `m("bd sd", <sourceLocation>)` mini-notation patterns.
- **Single quotes `'github:tidalcycles/dirt-samples'`** remain plain JavaScript strings. Use single quotes for URLs and sample pack identifiers.

## Mini-Notation Operators

| Operator | Syntax Example | Meaning | Step-Grid Representable (MVP) |
|---|---|---|---|
| Space | `"bd sd hh cp"` | Sequence steps across one cycle | Yes |
| Rest | `"bd ~ sd ~"` | Silence (`null` step) | Yes |
| Repeat | `"hh*4"` | Play token `n` times in the step's slot | Yes (expands or sub-divides) |
| Sub-group | `"bd [sd sd]"` | Subdivide one step into equal substeps | Yes (1 level deep) |
| Slow / Stretch | `"bd/2"` | Span over `n` cycles | No (`code-only` badge) |
| Alternation | `"<bd sd cp>"` | Pick one element per cycle | No (`code-only` badge) |
| Polyrhythm / Stack | `"[bd*2, hh*4]"` | Play patterns simultaneously | No (`code-only` badge) |
| Polymeter | `"{bd sd, hh hh hh}"` | Align steps of different lengths | No (`code-only` badge) |
| Euclidean | `"bd(3,8)"` | Bjorklund 3 hits over 8 steps | No (`code-only` badge) |
| Degrade | `"hh?"` or `"hh?0.2"` | Randomly drop events | No (`code-only` badge) |
| Replicate | `"bd!3"` | Repeat step without speeding up | Yes (expands to 3 steps) |
| Weight / Elongate | `"bd@2 sd"` | Give relative duration weight | No (`code-only` badge) |
| Sample Variant | `"sd:2"` | Select sample index 2 from bank | Yes (preserved on step token) |
