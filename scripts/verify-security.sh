#!/usr/bin/env bash
# ─── RentyBase anonymous-access security check ────────────────────────────────
#
# Every boundary below was, at some point, actually open in production. This
# script re-checks each one from the position an attacker occupies: holding the
# publishable anon key that ships in the client bundle, and nothing else.
#
# Run it after any migration touching RLS, policies, grants, views or storage.
#
#   ./scripts/verify-security.sh
#
# Reads NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from
# nextjs/.env.local. Exits non-zero on the first failure so CI can gate on it.
#
# What it deliberately does NOT cover: cross-tenant access between two signed-in
# users. That needs two seeded sessions and is the obvious next extension —
# every fix so far has been verified against the anonymous case plus SQL-level
# simulation of the policy predicates, which is weaker than exercising it.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT/nextjs/.env.local"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "FATAL: $ENV_FILE not found" >&2
  exit 2
fi

# shellcheck disable=SC1090
set -a; source "$ENV_FILE"; set +a

URL="${NEXT_PUBLIC_SUPABASE_URL:?}"
KEY="${NEXT_PUBLIC_SUPABASE_ANON_KEY:?}"

PASS=0
FAIL=0

# ── helpers ───────────────────────────────────────────────────────────────────

ok()   { printf '  \033[32mPASS\033[0m  %s\n' "$1"; PASS=$((PASS+1)); }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n         %s\n' "$1" "$2"; FAIL=$((FAIL+1)); }

# A table an anonymous caller must never read rows from. RLS returns an empty
# array rather than an error, so "[]" is the pass condition — a non-empty body
# means rows leaked.
expect_no_rows() {
  local table="$1"
  local body
  body=$(curl -s "$URL/rest/v1/$table?select=*&limit=3" -H "apikey: $KEY")
  if [[ "$body" == "[]" ]]; then
    ok "$table returns no rows to anon"
  else
    bad "$table LEAKED ROWS to anon" "${body:0:160}"
  fi
}

# A table anon must not even be granted SELECT on.
expect_forbidden() {
  local table="$1"
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' "$URL/rest/v1/$table?select=*&limit=1" -H "apikey: $KEY")
  if [[ "$code" == "401" || "$code" == "403" ]]; then
    ok "$table is not readable by anon (HTTP $code)"
  else
    bad "$table readable by anon" "expected 401/403, got $code"
  fi
}

expect_http() {
  local label="$1" expected="$2" actual="$3" detail="${4:-}"
  if [[ "$actual" == "$expected" ]]; then
    ok "$label (HTTP $actual)"
  else
    bad "$label" "expected HTTP $expected, got $actual ${detail}"
  fi
}

echo
echo "RentyBase security check — anonymous caller with the public anon key"
echo "project: ${URL#https://}"
echo

# ── 1. Table reads ────────────────────────────────────────────────────────────
# rentals leaked every live invite token (021). rental_activity_feed was a view
# without security_invoker, so it ignored RLS entirely (022).
echo "Tables and views must return no rows:"
for t in profiles properties rentals rent_payments deposit_transactions \
         repair_requests notifications rental_events messages buildings \
         proofs proof_photos rental_activity_feed; do
  expect_no_rows "$t"
done

echo
echo "Analytics tables must not be readable at all:"
# No SELECT policy AND no SELECT grant — a table nobody can read cannot leak.
expect_forbidden product_events
expect_forbidden client_errors

# ── 2. Writes ─────────────────────────────────────────────────────────────────
echo
echo "Writes:"

# 004's UPDATE policy let any caller claim an unassigned rental by id, no token.
#
# `Prefer: return=representation` matters here. Without it PostgREST answers 204
# both when it updated rows and when it matched none, so a status check alone
# cannot tell a blocked write from a successful one — which is exactly the kind of
# check that passes while the hole is open. Asking for the affected rows back
# makes the difference visible: [] is a denial, anything else is a breach.
body=$(curl -s -X PATCH \
  "$URL/rest/v1/rentals?tenant_id=is.null" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"tenant_id":"00000000-0000-0000-0000-000000000000"}')
if [[ "$body" == "[]" ]]; then
  ok "anon cannot claim a rental (zero rows affected)"
elif [[ "$body" == *'"code"'* ]]; then
  ok "anon rental claim rejected outright"
else
  bad "ANON CLAIMED RENTAL ROWS" "${body:0:200}"
fi

# The event taxonomy is enforced by a CHECK constraint, not just by the client.
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/product_events" \
  -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"event":"nonsense"}')
expect_http "unknown analytics event is rejected" "400" "$code"

# RLS requires user_id to be null or the caller's own.
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/product_events" \
  -H "apikey: $KEY" -H "Content-Type: application/json" \
  -d '{"event":"invite_opened","user_id":"073f1b61-9245-44e2-86c6-6462541fb98b"}')
expect_http "anon cannot attribute an event to another user" "401" "$code"

# ── 3. Invite RPCs ────────────────────────────────────────────────────────────
echo
echo "Invite flow:"

body=$(curl -s -X POST "$URL/rest/v1/rpc/rental_invite_preview" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"invite_token_input":"DEFINITELY-NOT-A-TOKEN"}')
if [[ "$body" == "[]" ]]; then
  ok "invite preview reveals nothing without a valid token"
else
  bad "invite preview returned data for a bogus token" "${body:0:160}"
fi

body=$(curl -s -X POST "$URL/rest/v1/rpc/claim_rental_invite" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"invite_token_input":"DEFINITELY-NOT-A-TOKEN"}')
if [[ "$body" == '"unauthenticated"' ]]; then
  ok "anon cannot claim an invite"
else
  bad "unexpected claim response" "${body:0:160}"
fi

# ── 3b. Privileged functions ──────────────────────────────────────────────────
#
# Postgres grants EXECUTE to PUBLIC on every new function, and PostgREST exposes
# every function at /rest/v1/rpc/. The cron jobs are SECURITY DEFINER, so until
# 036 anyone with the anon key could run them on demand. Idempotent today; the
# next one written in that style might not be.
echo
echo "Privileged functions must not be callable by anon:"
for fn in mark_overdue_payments ensure_current_month_rent accept_rental_invite; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/rpc/$fn"     -H "apikey: $KEY" -H "Content-Type: application/json" -d '{"invite_token_input":"x"}')
  if [[ "$code" == "401" || "$code" == "403" || "$code" == "404" ]]; then
    ok "anon cannot execute $fn (HTTP $code)"
  else
    bad "ANON CAN EXECUTE $fn" "expected 401/403/404, got $code"
  fi
done

# ── 4. Storage ────────────────────────────────────────────────────────────────
echo
echo "Storage:"

# proof-photos was public: this exact object downloaded with no key at all.
# Cache-busted, because Cloudflare serves the public path with max-age=3600 and a
# warm edge entry would mask a genuine regression.
SAMPLE="8a8068ac-4d2d-4347-b5ff-4e90945d8cde/2f98b601-3391-424b-91f5-03994b77ac1a/a879a4c6-5280-4560-b525-a51ad0d86ab1_1777650576064.jpg"
code=$(curl -s -o /dev/null -w '%{http_code}' \
  "$URL/storage/v1/object/public/proof-photos/$SAMPLE?cb=$RANDOM$RANDOM")
if [[ "$code" != "200" ]]; then
  ok "proof photos are not publicly downloadable (HTTP $code)"
else
  bad "PROOF PHOTO IS PUBLICLY DOWNLOADABLE" "bucket is public again"
fi

code=$(curl -s -o /dev/null -w '%{http_code}' -X POST \
  "$URL/storage/v1/object/sign/proof-photos/$SAMPLE" -H "apikey: $KEY" \
  -H "Content-Type: application/json" -d '{"expiresIn":60}')
if [[ "$code" != "200" ]]; then
  ok "anon cannot mint a signed URL for a proof photo (HTTP $code)"
else
  bad "anon signed a proof photo URL" "storage SELECT policy is too broad"
fi

# ── 5. Authenticated cross-tenant ─────────────────────────────────────────────
#
# The anonymous checks above are the easy half. The harder and more realistic
# attacker is someone who simply signs up — and that is where the worst hole in
# this codebase was found: `rent_payments` policies checked `auth.uid() = tenant_id`
# without checking the caller was the tenant OF THAT RENTAL, so any new account
# could write payments onto a stranger's ledger. Reasoning about the policies did
# not reveal it; signing in and trying it did.
#
# Needs SUPABASE_SERVICE_ROLE_KEY to mint and destroy a throwaway user. Skipped
# rather than failed when absent, so a normal local run stays useful — but it is
# a real gap in coverage when it skips, not a pass.

echo
echo "Authenticated cross-tenant:"

if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
  echo "  SKIP  set SUPABASE_SERVICE_ROLE_KEY to run these (they need a throwaway user)"
else
  PROBE_EMAIL="rls-probe-$RANDOM@rentybase-test.invalid"
  PROBE_PASS="Probe!Test-$RANDOM-aA"

  PROBE_ID=$(curl -s -X POST "$URL/auth/v1/admin/users" \
    -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$PROBE_PASS\",\"email_confirm\":true}" \
    | python -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)

  if [[ -z "$PROBE_ID" ]]; then
    bad "could not create probe user" "check SUPABASE_SERVICE_ROLE_KEY"
  else
    JWT=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
      -H "apikey: $KEY" -H "Content-Type: application/json" \
      -d "{\"email\":\"$PROBE_EMAIL\",\"password\":\"$PROBE_PASS\"}" \
      | python -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null)

    AUTH="Authorization: Bearer $JWT"

    # A signed-in stranger must see nothing but their own profile row.
    for t in properties rentals rent_payments deposit_transactions repair_requests \
             messages proofs proof_photos rental_events rental_activity_feed buildings; do
      body=$(curl -s "$URL/rest/v1/$t?select=*&limit=3" -H "apikey: $KEY" -H "$AUTH")
      if [[ "$body" == "[]" ]]; then
        ok "signed-in stranger sees no $t"
      else
        bad "signed-in stranger READ $t" "${body:0:140}"
      fi
    done

    # The hole itself: writing a payment onto a rental you have no part in.
    # Export PROBE_TARGET_RENTAL to aim at a real id; the placeholder still
    # exercises the same policy path, since membership fails either way and a 201
    # would be a breach regardless of which rental was targeted.
    TARGET_RENTAL="${PROBE_TARGET_RENTAL:-00000000-0000-0000-0000-000000000001}"
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/rent_payments" \
      -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
      -d "{\"rental_id\":\"$TARGET_RENTAL\",\"tenant_id\":\"$PROBE_ID\",\"amount\":1,\"month\":\"2026-01-01\"}")
    if [[ "$code" == "403" || "$code" == "401" ]]; then
      ok "signed-in stranger cannot write a payment onto another rental (HTTP $code)"
    else
      bad "STRANGER WROTE A PAYMENT" "expected 403, got $code"
    fi

    # Avatar writes must be scoped to the caller's own folder (035). Before that
    # migration any signed-in user could overwrite any avatar path in a PUBLIC
    # bucket -- i.e. replace someone else's profile picture.
    OTHER="00000000-0000-0000-0000-000000000002"
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST       "$URL/storage/v1/object/avatars/$OTHER/probe.png"       -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: image/png" --data-binary "x")
    if [[ "$code" == "400" || "$code" == "403" ]]; then
      ok "signed-in user cannot write into another user's avatar folder (HTTP $code)"
    else
      bad "AVATAR FOLDER WRITABLE BY OTHERS" "expected 400/403, got $code"
    fi
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST       "$URL/storage/v1/object/avatars/$PROBE_ID/probe.png"       -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: image/png" --data-binary "x")
    if [[ "$code" == "200" ]]; then
      ok "signed-in user can write their own avatar (HTTP $code)"
      curl -s -o /dev/null -X DELETE "$URL/storage/v1/object/avatars/$PROBE_ID/probe.png"         -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
    else
      bad "own avatar write blocked" "expected 200, got $code"
    fi

    # Clean up regardless of outcome.
    curl -s -o /dev/null -X DELETE "$URL/auth/v1/admin/users/$PROBE_ID" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
    echo "  ....  probe user removed"
  fi
fi

# ── summary ───────────────────────────────────────────────────────────────────
echo
echo "─────────────────────────────────────────"
printf '  %d passed, %d failed\n' "$PASS" "$FAIL"
echo

[[ "$FAIL" -eq 0 ]] || exit 1
