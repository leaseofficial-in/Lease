#!/usr/bin/env python3
"""Nothing secret may reach the browser.

Why this exists
---------------
Every server secret in this app is one `NEXT_PUBLIC_` prefix, one misplaced import
or one "use client" away from being compiled into a chunk that anyone can download.
The service role key is the worst case: it bypasses RLS entirely, so shipping it
would undo every policy in supabase/migrations at once, silently, with no error and
nothing in a log.

Nothing else checks this. The build succeeds either way, the tests never look at
the output, and the security harness talks to the database rather than to the
bundle.

What it does
------------
Reads `nextjs/.next/static` -- the directory that is served to browsers -- and
looks for material that must never be there: the service role key itself when it
is available in the environment, the Supabase/Vercel/GitHub token prefixes, the
Resend key prefix, and the *names* of server-only environment variables (their
presence in a client chunk means server code was pulled into the browser graph,
which is worth knowing even before a value leaks).

The publishable anon key is expected in the bundle and is not flagged: it is
designed to ship, and RLS is what stands behind it.

Usage
-----
    python scripts/check-bundle-secrets.py

Exits 1 on a hit, 0 when clean, and 0 with a note when there is no build to scan --
this is a check on build output, not a reason to fail a machine that has not built.
"""

import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLIENT_DIR = os.path.join(ROOT, 'nextjs', '.next', 'static')

# name -> (needle, why it matters)
PATTERNS = {
    'Supabase service role key': (os.environ.get('SUPABASE_SERVICE_ROLE_KEY', ''),
                                  'bypasses every RLS policy'),
    'Supabase management token': ('sbp_', 'full control of the project'),
    'Vercel token': ('vcp_', 'full control of the deployment'),
    'GitHub token': ('ghp_', 'full control of the repository'),
    'Resend API key': ('re_' + 'live_', 'can send mail as this domain'),
    'SUPABASE_SERVICE_ROLE_KEY (name)': ('SUPABASE_SERVICE_ROLE_KEY',
                                         'server-only code reached the client graph'),
    'CRON_SECRET (name)': ('CRON_SECRET', 'server-only code reached the client graph'),
}


def main():
    if not os.path.isdir(CLIENT_DIR):
        print('  SKIP  no build output at nextjs/.next/static -- run npm run build first')
        return 0

    findings = []
    scanned = 0
    for dirpath, _, filenames in os.walk(CLIENT_DIR):
        for filename in filenames:
            if not filename.endswith(('.js', '.json', '.css', '.map')):
                continue
            path = os.path.join(dirpath, filename)
            scanned += 1
            try:
                with open(path, encoding='utf-8', errors='ignore') as handle:
                    content = handle.read()
            except OSError:
                continue
            for label, (needle, why) in PATTERNS.items():
                if needle and needle in content:
                    findings.append((label, why, os.path.relpath(path, ROOT)))

    if not findings:
        print('  PASS  no secret material in the client bundle (%d files)' % scanned)
        return 0

    print('  FAIL  secret material is being served to browsers:')
    for label, why, relative in findings:
        print('        %-34s %s' % (label, relative))
        print('        %-34s %s' % ('', why))
    return 1


if __name__ == '__main__':
    sys.exit(main())
