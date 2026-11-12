#!/usr/bin/env python3
"""SessionStart hook for Strum: injects current implementation plan status."""

import json
import pathlib
import re
import sys


def find_latest_plan(workspace: pathlib.Path):
  plans_dir = workspace / 'docs' / 'superpowers' / 'plans'
  if not plans_dir.exists():
    return None
  plans = sorted(plans_dir.glob('*.md'))
  return plans[-1] if plans else None


def extract_open_tasks(plan_path: pathlib.Path, max_items: int = 5):
  text = plan_path.read_text(encoding='utf-8', errors='replace')
  current_heading = 'Plan'
  open_steps = []
  for line in text.splitlines():
    if line.startswith('## ') or line.startswith('### '):
      current_heading = line.lstrip('#').strip()
    elif re.match(r'^\s*-\s*\[\s\]\s+', line):
      step = re.sub(r'^\s*-\s*\[\s\]\s+', '', line).strip()
      open_steps.append(f'[{current_heading}] {step}')
      if len(open_steps) >= max_items:
        break
  return open_steps


def main():
  try:
    payload = json.loads(sys.stdin.read() or '{}')
  except ValueError:
    payload = {}

  cwd = payload.get('cwd') or '.'
  workspace = pathlib.Path(cwd).resolve()
  plan = find_latest_plan(workspace)
  if not plan:
    print(json.dumps({}))
    return

  open_steps = extract_open_tasks(plan)
  if not open_steps:
    msg = f'Strum active plan ({plan.name}): all checkboxes completed.'
  else:
    joined = '\n'.join(f'  - {s}' for s in open_steps)
    msg = (
        f'Strum active plan ({plan.relative_to(workspace)}). '
        f'Next open steps:\n{joined}'
    )

  out = {
      'injectSteps': [
          {
              'systemMessage': {
                  'systemMessage': msg,
              }
          }
      ]
  }
  print(json.dumps(out))


if __name__ == '__main__':
  main()

