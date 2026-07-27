#!/usr/bin/env python3
"""K2 site pre-deploy validator. Run from the repo root before every push:

    python3 check.py

Exits non-zero if anything fails. Checks every *.html page for:
  - JSON-LD schema blocks that actually parse
  - internal links that resolve to real files
  - referenced local images that exist
  - CSS leaking outside <style> blocks (renders as visible text)
  - heading levels that skip (h2 -> h4) — breaks screen readers
  - exactly one <main> landmark per page
  - accessibility regressions: the failing brass #8f7214, opacity-dimmed text
"""
import glob, json, os, re, sys

fails = []

def fail(msg):
    fails.append(msg)

pages = sorted(glob.glob('**/*.html', recursive=True))
all_files = set(glob.glob('**/*', recursive=True))

for path in pages:
    s = open(path, encoding='utf-8').read()

    # 1. JSON-LD parses
    for i, m in enumerate(re.finditer(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)):
        try:
            json.loads(m.group(1))
        except json.JSONDecodeError as e:
            fail(f'{path}: JSON-LD block {i+1} does not parse ({e})')

    # 2. Internal links resolve
    for href in re.findall(r'href="(/[^"#?]*)"', s):
        target = href.lstrip('/')
        if target == '':
            continue
        candidates = [target, target.rstrip('/') + '/index.html', target + 'index.html']
        if not any(c in all_files or os.path.exists(c) for c in candidates):
            fail(f'{path}: internal link {href} resolves to nothing')

    # 3. Local images exist
    for src in re.findall(r'src="(/img/[^"]+)"', s):
        clean = src.split('?')[0].lstrip('/')
        if not os.path.exists(clean):
            fail(f'{path}: missing image {src}')

    # 4. Stray CSS outside <style> (a past real bug: rendered as body text)
    body = s[s.find('<body'):]
    if re.search(r'^\s*\.[a-z][\w-]*\s*\{[^}]*\}\s*$', body, re.M) and '<style' not in body:
        fail(f'{path}: CSS rules appear outside <style> and will render as text')

    # 5. Heading order never skips downward
    levels = [int(m) for m in re.findall(r'<h([1-6])[\s>]', s)]
    prev = 0
    for lv in levels:
        if prev and lv > prev + 1:
            fail(f'{path}: heading skips h{prev} -> h{lv}')
        prev = lv

    # 6. Exactly one <main>
    if s.count('<main') != 1 or s.count('</main>') != 1:
        fail(f'{path}: expected exactly one <main> landmark, found {s.count("<main")}')

    # 7. Accessibility regressions
    if '#8f7214' in s:
        fail(f'{path}: old brass #8f7214 reintroduced (fails WCAG contrast on panel; use #7a600e)')
    for m in re.findall(r'style="[^"]*opacity:\s*\.?0?\.?[1-6][^"]*"', s):
        if '<img' not in m:
            fail(f'{path}: text dimmed with inline opacity ({m}) — likely a contrast failure')

if fails:
    print(f'FAIL — {len(fails)} problem(s):')
    for f in fails:
        print('  ' + f)
    sys.exit(1)
print(f'PASS — {len(pages)} pages checked, no problems found.')
