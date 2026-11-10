#!/usr/bin/env python3
"""Vendor individual files from alaca/weft-loom with AGPL attribution and rate limiting."""

from __future__ import annotations

import argparse
import fcntl
import hashlib
import json
import pathlib
import sys
import time
from urllib import error as urllib_error
from urllib import request as urllib_request

DEFAULT_SHA = '3fdda763e3c99a576b9ba92c0e58750ed135d8f7'


class RateLimitError(Exception):
  """Raised when the GitHub raw content rate limit is exceeded."""


class WeftGitHubClient:
  BASE_URL = 'https://raw.githubusercontent.com/alaca/weft-loom'
  REQUESTS_PER_SECOND = 1
  LOCK_FILE = pathlib.Path('/tmp/strum_weft_vendor_ratelimit.lock')

  def __init__(self):
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

  def fetch_text(self, sha: str, remote_path: str, retries: int = 3) -> str:
    clean_path = remote_path.lstrip('/')
    url = f'{self.BASE_URL}/{sha}/{clean_path}'
    for attempt in range(retries):
      self._wait_for_rate_limit()
      try:
        req = urllib_request.Request(url, headers={'Accept': 'text/plain'})
        with urllib_request.urlopen(req, timeout=30) as resp:
          return resp.read().decode('utf-8')
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


def write_output(data: dict, output_file: str):
  out_path = pathlib.Path(output_file)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with out_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
  print(f'Success! Data written to: {output_file}')


def build_header(remote_path: str, sha: str) -> str:
  return (
      '// SPDX-License-Identifier: AGPL-3.0-or-later\n'
      f'// Vendored from https://github.com/alaca/weft-loom/blob/{sha}/{remote_path}\n'
      f'// Upstream commit SHA: {sha}\n'
      '// Adapted for Strum (Android mobile Strudel client).\n\n'
  )


def cmd_fetch(args) -> dict:
  project_dir = pathlib.Path(args.project_dir).resolve()
  vendor_dir = project_dir / 'src' / 'vendor' / 'weft'
  vendor_dir.mkdir(parents=True, exist_ok=True)

  client = WeftGitHubClient()
  raw_code = client.fetch_text(args.sha, args.remote_path)
  header = build_header(args.remote_path, args.sha)
  full_content = header + raw_code

  dest_path = vendor_dir / args.dest
  dest_path.parent.mkdir(parents=True, exist_ok=True)
  dest_path.write_text(full_content, encoding='utf-8')

  sha256 = hashlib.sha256(full_content.encode('utf-8')).hexdigest()
  manifest_path = vendor_dir / 'VENDORED.json'
  manifest = {'files': []}
  if manifest_path.exists():
    try:
      manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    except ValueError:
      manifest = {'files': []}

  files = [f for f in manifest.get('files', []) if f.get('dest') != args.dest]
  entry = {
      'dest': args.dest,
      'remote_path': args.remote_path,
      'upstream_repo': 'https://github.com/alaca/weft-loom',
      'upstream_sha': args.sha,
      'license': 'AGPL-3.0-or-later',
      'sha256': sha256,
  }
  files.append(entry)
  manifest['files'] = files
  manifest_path.write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')

  return {'ok': True, 'vendored': entry, 'manifest_path': str(manifest_path)}


def cmd_inspect(args) -> tuple[dict, bool]:
  project_dir = pathlib.Path(args.project_dir).resolve()
  vendor_dir = project_dir / 'src' / 'vendor' / 'weft'
  manifest_path = vendor_dir / 'VENDORED.json'
  if not vendor_dir.exists() or not manifest_path.exists():
    return (
        {
            'ok': True,
            'vendored_count': 0,
            'files': [],
            'note': 'No files vendored yet in src/vendor/weft/.',
        },
        True,
    )

  manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
  issues = []
  checked = []
  for item in manifest.get('files', []):
    f_path = vendor_dir / item['dest']
    if not f_path.exists():
      issues.append(f"Missing vendored file: {item['dest']}")
      continue
    text = f_path.read_text(encoding='utf-8', errors='replace')
    has_spdx = 'SPDX-License-Identifier: AGPL-3.0-or-later' in text
    has_sha = item.get('upstream_sha', '') in text
    if not (has_spdx and has_sha):
      issues.append(f"File {item['dest']} is missing SPDX or upstream SHA header")
    checked.append({**item, 'has_spdx': has_spdx, 'has_sha': has_sha})

  ok = len(issues) == 0
  return ({'ok': ok, 'vendored_count': len(checked), 'files': checked, 'issues': issues}, ok)


def main():
  parser = argparse.ArgumentParser(description='Weft Loom Vendoring CLI')
  subparsers = parser.add_subparsers(dest='command', required=True)

  p_fetch = subparsers.add_parser('fetch', help='Fetch and vendor a file from alaca/weft-loom')
  p_fetch.add_argument('--remote-path', required=True, help='Path in weft-loom repo, e.g. src/controls/catalog.ts')
  p_fetch.add_argument('--sha', default=DEFAULT_SHA, help='Pinned commit SHA')
  p_fetch.add_argument('--dest', required=True, help='Relative filename inside src/vendor/weft/')
  p_fetch.add_argument('--project-dir', default='.')
  p_fetch.add_argument('--output', required=True, help='Output JSON report file path')

  p_inspect = subparsers.add_parser('inspect', help='Verify vendored files and headers')
  p_inspect.add_argument('--project-dir', default='.')
  p_inspect.add_argument('--output', required=True, help='Output JSON report file path')

  args = parser.parse_args()
  try:
    if args.command == 'fetch':
      data = cmd_fetch(args)
      write_output(data, args.output)
    elif args.command == 'inspect':
      data, ok = cmd_inspect(args)
      write_output(data, args.output)
      if not ok:
        sys.exit(1)
  except (RateLimitError, RuntimeError) as e:
    print(f'Error: {e}', file=sys.stderr)
    write_output({'ok': False, 'error': str(e)}, args.output)
    sys.exit(1)


if __name__ == '__main__':
  main()
