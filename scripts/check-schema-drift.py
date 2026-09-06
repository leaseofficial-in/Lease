#!/usr/bin/env python3
"""Every column the client names must exist in the database.

Why this exists
---------------
The tenant's deposit screen was blank for months. Not a permission problem, not a
bug anyone could see in the code: the query asked PostgREST for three columns from
a migration that was never applied (two files were both numbered 002, and one of
them lost). PostgREST rejects the WHOLE request for a single unknown column, and
the client's `data || []` renders that rejection as "you have no deductions".

Nothing catches this. TypeScript does not know the database. The tests mock it.
The build never talks to it. The one thing that would have caught it is asking the
database what columns it has and comparing.

The same failure on the write side is louder but was just as silent in practice:
the repair auto-deduction inserted a `description` column that does not exist and
omitted `created_by`, and nobody checked the result.

What it does
------------
Reads the live column list from PostgREST's OpenAPI document, then walks every
`.select('...')`, `.insert({...})`, `.update({...})` and `.upsert({...})` in
nextjs/app and nextjs/lib and reports any column that the database does not have.

Embedded resources (`property:properties(*)`) are skipped -- those are separate
tables and PostgREST resolves them by relationship, not by column name.

Usage
-----
    SUPABASE_SERVICE_ROLE_KEY=... python scripts/check-schema-drift.py

Needs the service key because the anon role is not allowed to introspect. Exits 1
on any drift, 0 when clean, and skips (0) with a loud note if the key is absent --
the same contract as the authenticated half of verify-security.sh.
"""

import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DIRS = [os.path.join(ROOT, 'nextjs', 'app'), os.path.join(ROOT, 'nextjs', 'lib')]
ENV_FILE = os.path.join(ROOT, 'nextjs', '.env.local')

SELECT_RE = re.compile(r"from\('(\w+)'\)\s*\.select\(\s*[`'\"]([^`'\"]*)[`'\"]")
MUTATE_RE = re.compile(r"from\('(\w+)'\)\s*\.(insert|update|upsert)\(\s*\{", re.S)
EMBED_ALIAS_RE = re.compile(r"\w+\s*:\s*\w+!?\w*\([^()]*\)")
EMBED_RE = re.compile(r"\w+\([^()]*\)")
KEY_RE = re.compile(r"(?:^|,)\s*([A-Za-z_]\w*)\s*:")
NESTED_OBJ_RE = re.compile(r"\{[^{}]*\}")


def read_env(path):
    values = {}
    if not os.path.exists(path):
        return values
    with open(path, encoding='utf-8') as handle:
        for line in handle:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                values[key.strip()] = value.strip()
    return values


def live_columns(url, key):
    request = urllib.request.Request(
        url.rstrip('/') + '/rest/v1/',
        headers={'apikey': key, 'Authorization': 'Bearer ' + key},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        spec = json.load(response)
    definitions = spec.get('definitions', {})
    if not definitions:
        raise SystemExit('the API returned no table definitions -- is the key a service role key?')
    return {name: set(body.get('properties', {})) for name, body in definitions.items()}


def source_files():
    for directory in SOURCE_DIRS:
        for dirpath, _, filenames in os.walk(directory):
            for filename in filenames:
                if filename.endswith(('.ts', '.tsx')):
                    yield os.path.join(dirpath, filename)


def object_literal(source, start):
    """The brace-matched body of the object literal beginning at `start`."""
    depth = 0
    for index in range(start, len(source)):
        if source[index] == '{':
            depth += 1
        elif source[index] == '}':
            depth -= 1
            if depth == 0:
                return source[start + 1:index]
    return ''


def scan(schema):
    findings = []
    for path in source_files():
        with open(path, encoding='utf-8') as handle:
            source = handle.read()
        relative = os.path.relpath(path, ROOT).replace(os.sep, '/')

        for match in SELECT_RE.finditer(source):
            table, columns = match.group(1), match.group(2)
            if table not in schema:
                continue
            flat = EMBED_RE.sub('', EMBED_ALIAS_RE.sub('', columns))
            for column in (piece.strip().split('.')[0].strip() for piece in flat.split(',')):
                if not column or column == '*' or ':' in column:
                    continue
                if column not in schema[table]:
                    line = source[:match.start()].count('\n') + 1
                    findings.append(('select', relative, line, table, column))

        for match in MUTATE_RE.finditer(source):
            table, operation = match.group(1), match.group(2)
            if table not in schema:
                continue
            body = object_literal(source, source.index('{', match.end() - 1))
            for key in KEY_RE.findall(NESTED_OBJ_RE.sub('', body)):
                if key not in schema[table]:
                    line = source[:match.start()].count('\n') + 1
                    findings.append((operation, relative, line, table, key))

    return sorted(set(findings))


def main():
    env = read_env(ENV_FILE)
    url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL') or env.get('NEXT_PUBLIC_SUPABASE_URL')
    key = os.environ.get('SUPABASE_SERVICE_ROLE_KEY')

    if not url:
        raise SystemExit('NEXT_PUBLIC_SUPABASE_URL not found in environment or nextjs/.env.local')
    if not key:
        print('  SKIP  set SUPABASE_SERVICE_ROLE_KEY to check client queries against the live schema')
        return 0

    schema = live_columns(url, key)
    findings = scan(schema)

    if not findings:
        print('  PASS  every column the client names exists in the database (%d tables)' % len(schema))
        return 0

    print('  FAIL  %d client column reference(s) the database does not have:' % len(findings))
    for operation, relative, line, table, column in findings:
        print('        %-7s %s:%s  %s.%s' % (operation, relative, line, table, column))
    print()
    print('        A select naming an unknown column 400s the WHOLE query, and')
    print('        `data || []` renders that as an empty screen. Either the column')
    print('        belongs in a migration that was never applied, or the client is')
    print('        naming something that has never existed.')
    return 1


if __name__ == '__main__':
    sys.exit(main())
