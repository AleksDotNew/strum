#!/usr/bin/env python3
"""Strudel documentation and mini-notation lookup CLI with rate limiting."""

from __future__ import annotations

import argparse
import fcntl
import json
import pathlib
import sys
import time
from urllib import error as urllib_error
from urllib import request as urllib_request

BUILTIN_CATALOG = [
    {
        'name': 's',
        'signature': 's(pattern: string | Pattern): Pattern',
        'description': 'Selects sound/sample or synth by name (mini-notation supported).',
        'examples': ['s("bd sd [~ bd] sd")', 's("sawtooth").note("c3 e3")'],
    },
    {
        'name': 'note',
        'signature': 'note(pattern: string | Pattern): Pattern',
        'description': 'Sets pitch by note name (e.g. c3, eb4) or MIDI number.',
        'examples': ['note("c3 e3 g3 b3").s("piano")'],
    },
    {
        'name': 'n',
        'signature': 'n(pattern: string | number | Pattern): Pattern',
        'description': 'Selects sample index within a bank or scale degree when combined with .scale().',
        'examples': ['s("bd sd").n("0 2")', 'n("0 2 4 7").scale("C:minor").s("sawtooth")'],
    },
    {
        'name': 'bank',
        'signature': 'bank(prefix: string | Pattern): Pattern',
        'description': 'Prefixes sound names with a drum machine or sample bank (e.g. RolandTR909).',
        'examples': ['s("bd sd hh*4").bank("RolandTR909")'],
    },
    {
        'name': 'fast',
        'signature': 'fast(factor: number | Pattern): Pattern',
        'description': 'Speeds up the pattern by the given factor.',
        'examples': ['s("bd sd").fast(2)'],
    },
    {
        'name': 'slow',
        'signature': 'slow(factor: number | Pattern): Pattern',
        'description': 'Slows down the pattern by the given factor.',
        'examples': ['s("bd sd").slow(2)'],
    },
    {
        'name': 'lpf',
        'signature': 'lpf(frequency: number | Pattern): Pattern',
        'description': 'Low-pass filter cutoff frequency in Hz (20..20000).',
        'examples': ['s("sawtooth*8").note("c2").lpf(800)'],
    },
    {
        'name': 'hpf',
        'signature': 'hpf(frequency: number | Pattern): Pattern',
        'description': 'High-pass filter cutoff frequency in Hz (20..20000).',
        'examples': ['s("hh*8").hpf(4000)'],
    },
    {
        'name': 'gain',
        'signature': 'gain(amount: number | Pattern): Pattern',
        'description': 'Controls amplitude/volume of events (typically 0..1.5).',
        'examples': ['s("hh*8").gain("0.8 0.4")'],
    },
    {
        'name': 'room',
        'signature': 'room(amount: number | Pattern): Pattern',
        'description': 'Reverb send level (0..1).',
        'examples': ['s("sd").room(0.5)'],
    },
    {
        'name': 'delay',
        'signature': 'delay(amount: number | Pattern): Pattern',
        'description': 'Delay wet level (0..1).',
        'examples': ['note("c4 e4").s("triangle").delay(0.4)'],
    },
    {
        'name': 'pan',
        'signature': 'pan(position: number | Pattern): Pattern',
        'description': 'Stereo panning from 0 (left) to 1 (right), 0.5 center.',
        'examples': ['s("hh*4").pan("0 0.3 0.7 1")'],
    },
    {
        'name': 'scale',
        'signature': 'scale(name: string | Pattern): Pattern',
        'description': 'Maps scale degrees from n() onto a musical scale via @strudel/tonal.',
        'examples': ['n("0 1 2 3 4").scale("C:minor").s("piano")'],
    },
    {
        'name': 'samples',
        'signature': 'samples(source: string | Record<string, string | string[]>, baseUrl?: string): Promise<void>',
        'description': 'Registers external sample maps (e.g. github:owner/repo or strudel.json URL).',
        'examples': ["samples('github:tidalcycles/dirt-samples')"],
    },
]

MINI_OPERATORS = [
    {'symbol': '~', 'name': 'rest', 'example': 'bd ~ sd ~', 'grid_supported': True, 'description': 'Silence for one step'},
    {'symbol': '*', 'name': 'multiply', 'example': 'hh*4', 'grid_supported': True, 'description': 'Repeat token N times within the step'},
    {'symbol': '[ ]', 'name': 'subdivide', 'example': 'bd [sd sd]', 'grid_supported': True, 'description': 'Group substeps into a single step slot (1 level in grid)'},
    {'symbol': '!', 'name': 'replicate', 'example': 'bd!3 sd', 'grid_supported': True, 'description': 'Repeat step N times'},
    {'symbol': ':', 'name': 'variant', 'example': 'sd:2', 'grid_supported': True, 'description': 'Select sample index within sound family'},
    {'symbol': '/', 'name': 'slow', 'example': 'bd/2', 'grid_supported': False, 'description': 'Stretch over N cycles (code-only)'},
    {'symbol': '< >', 'name': 'alternate', 'example': '<bd sd cp>', 'grid_supported': False, 'description': 'Alternate one element per cycle (code-only)'},
    {'symbol': ',', 'name': 'polyrhythm', 'example': '[bd*2, hh*4]', 'grid_supported': False, 'description': 'Play sub-patterns simultaneously (code-only)'},
    {'symbol': '{ }', 'name': 'polymeter', 'example': '{bd sd, hh hh hh}', 'grid_supported': False, 'description': 'Polymetric alignment (code-only)'},
    {'symbol': '( , )', 'name': 'euclidean', 'example': 'bd(3,8)', 'grid_supported': False, 'description': 'Euclidean rhythm distribution (code-only)'},
    {'symbol': '?', 'name': 'degrade', 'example': 'hh?0.5', 'grid_supported': False, 'description': 'Probabilistic drop (code-only)'},
    {'symbol': '@', 'name': 'weight', 'example': 'bd@2 sd', 'grid_supported': False, 'description': 'Relative temporal weight (code-only)'},
]


class RateLimitError(Exception):
  """Raised when the upstream API rate limit is exceeded."""


class StrudelDocClient:
  BASE_URL = 'https://raw.githubusercontent.com/tidalcycles/strudel/main'
  REQUESTS_PER_SECOND = 1
  LOCK_FILE = pathlib.Path('/tmp/strum_strudel_docs_ratelimit.lock')

  def __init__(self, project_dir: pathlib.Path):
    self.project_dir = project_dir
    self.delay = 1.0 / self.REQUESTS_PER_SECOND
    self.last_request_time = 0.0

  def _wait_for_rate_limit(self):
    self.LOCK_FILE.touch(exist_ok=True)
    with self.LOCK_FILE.open('r+', encoding='utf-8') as lock_f:
      fcntl.flock(lock_f.fileno(), fcntl.LOCK_EX)
      try:
        content = lock_f.read().strip()
        last_ts = float(content) if content else 0.0
      except ValueError:
        last_ts = 0.0
      now = time.monotonic()
      elapsed = now - max(last_ts, self.last_request_time)
      if 0 <= elapsed < self.delay:
        time.sleep(self.delay - elapsed)
      new_ts = time.monotonic()
      self.last_request_time = new_ts
      lock_f.seek(0)
      lock_f.truncate()
      lock_f.write(str(new_ts))
      lock_f.flush()
      fcntl.flock(lock_f.fileno(), fcntl.LOCK_UN)

  def _request_upstream(self, path: str, retries: int = 3) -> dict:
    url = f'{self.BASE_URL}{path}'
    for attempt in range(retries):
      self._wait_for_rate_limit()
      try:
        req = urllib_request.Request(url, headers={'Accept': 'application/json'})
        with urllib_request.urlopen(req, timeout=20) as resp:
          return json.loads(resp.read().decode('utf-8'))
      except urllib_error.HTTPError as e:
        if e.code == 429:
          wait = 2**attempt
          print(
              f'Rate limited (429) from {url}, retrying in {wait}s '
              f'(attempt {attempt + 1}/{retries})...',
              file=sys.stderr,
          )
          if attempt == retries - 1:
            raise RateLimitError(
                f'HTTP 429 Too Many Requests from {url} '
                f'(rate limit {self.REQUESTS_PER_SECOND} req/s).'
            ) from e
          time.sleep(wait)
          continue
        if e.code >= 500:
          wait = 2**attempt
          print(
              f'Server error {e.code} from {url}, retrying in {wait}s '
              f'(attempt {attempt + 1}/{retries})...',
              file=sys.stderr,
          )
          if attempt == retries - 1:
            raise RuntimeError(f'Server error {e.code} from {url} after {retries} retries.') from e
          time.sleep(wait)
          continue
        try:
          body = e.read().decode('utf-8', errors='replace')[:1000]
        except OSError:
          body = e.reason
        raise RuntimeError(f'HTTP {e.code} from {url}: {body}') from e
      except urllib_error.URLError as e:
        if attempt == retries - 1:
          raise RuntimeError(f'Failed to connect to {url}: {e}') from e
        time.sleep(2**attempt)
    raise RuntimeError(f'Exhausted retries for {url}')

  def load_catalog(self) -> list[dict]:
    # Check local node_modules doc.json first
    candidates = list(self.project_dir.glob('node_modules/@strudel/**/doc.json'))
    candidates += list(self.project_dir.glob('src/hints/doc.json'))
    for c in candidates:
      try:
        raw = json.loads(c.read_text(encoding='utf-8'))
        docs = raw.get('docs') if isinstance(raw, dict) else raw
        if isinstance(docs, list) and docs:
          normalized = []
          for item in docs:
            if not isinstance(item, dict) or not item.get('name'):
              continue
            normalized.append({
                'name': item.get('name'),
                'signature': item.get('signature') or f"{item.get('name')}(...)",
                'description': item.get('description') or '',
                'examples': item.get('examples') or [],
            })
          if normalized:
            return normalized
      except (OSError, ValueError):
        continue
    return BUILTIN_CATALOG


def write_output(data: dict, output_file: str):
  out_path = pathlib.Path(output_file)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with out_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
  print(f'Success! Data written to: {output_file}')


def main():
  parser = argparse.ArgumentParser(description='Strudel API & Mini-Notation Reference CLI')
  subparsers = parser.add_subparsers(dest='command', required=True)

  p_search = subparsers.add_parser('search', help='Search Strudel functions')
  p_search.add_argument('--query', required=True, help='Search substring')
  p_search.add_argument('--limit', type=int, required=True, help='Max results to return')
  p_search.add_argument('--project-dir', default='.')
  p_search.add_argument('--output', required=True, help='Output JSON file path')

  p_fn = subparsers.add_parser('fn', help='Get details for a function by exact name')
  p_fn.add_argument('--name', required=True, help='Function name (e.g. lpf)')
  p_fn.add_argument('--project-dir', default='.')
  p_fn.add_argument('--output', required=True, help='Output JSON file path')

  p_mini = subparsers.add_parser('mini', help='Output mini-notation operator reference')
  p_mini.add_argument('--output', required=True, help='Output JSON file path')

  args = parser.parse_args()
  if args.command == 'mini':
    write_output({'operators': MINI_OPERATORS}, args.output)
    return

  client = StrudelDocClient(pathlib.Path(args.project_dir).resolve())
  catalog = client.load_catalog()

  if args.command == 'search':
    q = args.query.lower()
    matches = [
        fn for fn in catalog
        if q in fn['name'].lower() or q in fn.get('description', '').lower()
    ][: args.limit]
    write_output({'query': args.query, 'count': len(matches), 'results': matches}, args.output)
  elif args.command == 'fn':
    found = next((fn for fn in catalog if fn['name'] == args.name), None)
    if not found:
      print(f'Function "{args.name}" not found in catalog.', file=sys.stderr)
      write_output({'found': False, 'name': args.name}, args.output)
      sys.exit(1)
    write_output({'found': True, 'function': found}, args.output)


if __name__ == '__main__':
  main()
