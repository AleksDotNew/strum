#!/usr/bin/env python3
"""Strum Mobile UI ergonomics auditor for Pixel 9a (412x915)."""

from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys


def write_output(data: dict, output_file: str):
  out_path = pathlib.Path(output_file)
  out_path.parent.mkdir(parents=True, exist_ok=True)
  with out_path.open('w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
  print(f'Success! Data written to: {output_file}')


def cmd_static_check(project_dir: pathlib.Path) -> tuple[dict, bool]:
  issues = []
  checks = {}

  index_html = project_dir / 'index.html'
  if not index_html.exists():
    issues.append('index.html not found')
    checks['index_html_exists'] = False
  else:
    checks['index_html_exists'] = True
    html = index_html.read_text(encoding='utf-8', errors='replace')
    for token in ('user-scalable=no', 'maximum-scale=1', 'viewport-fit=cover'):
      present = token in html
      checks[f'viewport_{token}'] = present
      if not present:
        issues.append(f'index.html viewport meta is missing "{token}"')

  css_file = project_dir / 'src' / 'styles' / 'app.css'
  if not css_file.exists():
    issues.append('src/styles/app.css not found')
    checks['app_css_exists'] = False
  else:
    checks['app_css_exists'] = True
    css = css_file.read_text(encoding='utf-8', errors='replace')
    for token in ('--kb', 'touch-action: manipulation', 'overflow: hidden', 'min-height: 48px'):
      present = token in css
      checks[f'css_{token}'] = present
      if not present:
        issues.append(f'src/styles/app.css is missing "{token}"')

  ok = len(issues) == 0
  return ({'ok': ok, 'checks': checks, 'issues': issues}, ok)


def cmd_layout_e2e(project_dir: pathlib.Path) -> tuple[dict, bool]:
  spec = project_dir / 'tests' / 'e2e' / 'layout.spec.ts'
  if not spec.exists():
    return (
        {
            'ok': False,
            'error': 'tests/e2e/layout.spec.ts not found. Create it per Task 1.1.',
        },
        False,
    )
  proc = subprocess.run(
      ['npx', 'playwright', 'test', 'tests/e2e/layout.spec.ts', '--reporter=json'],
      cwd=str(project_dir),
      capture_output=True,
      text=True,
      timeout=180,
      check=False,
  )
  ok = proc.returncode == 0
  return (
      {
          'ok': ok,
          'exit_code': proc.returncode,
          'stdout_tail': proc.stdout[-4000:] if proc.stdout else '',
          'stderr_tail': proc.stderr[-2000:] if proc.stderr else '',
      },
      ok,
  )


def main():
  parser = argparse.ArgumentParser(description='Strum mobile UI audit CLI')
  subparsers = parser.add_subparsers(dest='command', required=True)

  p_static = subparsers.add_parser('static-check', help='Run static viewport and CSS checks')
  p_static.add_argument('--project-dir', default='.')
  p_static.add_argument('--output', required=True)

  p_e2e = subparsers.add_parser('layout-e2e', help='Run Playwright 412x915 layout test')
  p_e2e.add_argument('--project-dir', default='.')
  p_e2e.add_argument('--output', required=True)

  args = parser.parse_args()
  proj = pathlib.Path(args.project_dir).resolve()
  if args.command == 'static-check':
    data, ok = cmd_static_check(proj)
  elif args.command == 'layout-e2e':
    data, ok = cmd_layout_e2e(proj)
  else:
    sys.exit(1)

  write_output(data, args.output)
  if not ok:
    sys.exit(1)


if __name__ == '__main__':
  main()
