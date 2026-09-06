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

# ── summary ───────────────────────────────────────────────────────────────────
echo
echo "─────────────────────────────────────────"
printf '  %d passed, %d failed\n' "$PASS" "$FAIL"
echo

[[ "$FAIL" -eq 0 ]] || exit 1
