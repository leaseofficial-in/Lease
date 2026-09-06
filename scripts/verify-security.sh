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
         repair_requests notifications rental_events buildings \
         proofs proof_photos rental_activity_feed; do
  expect_no_rows "$t"
done

echo
echo "Analytics tables must not be readable at all:"
# No SELECT policy AND no SELECT grant — a table nobody can read cannot leak.
expect_forbidden product_events
expect_forbidden client_errors
# messages lost its anon grant entirely in 038: an anonymous caller gets 42501,
# not an empty array. Stronger than RLS returning nothing.
expect_forbidden messages

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

    # ── Sender binding on messages (038) ──
    # The messages policy was FOR ALL with no WITH CHECK, so any party to a
    # rental could insert a message carrying the OTHER party's sender_id, and
    # edit or delete the other side's messages. A stranger cannot test that —
    # membership fails first — so the probe is made landlord of a throwaway
    # rental with the service key, then tries to speak as someone else.
    SR="Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
    PROBE_PROP=$(curl -s -X POST "$URL/rest/v1/properties" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -d "{\"landlord_id\":\"$PROBE_ID\",\"name\":\"rls-probe\"}" \
      | python -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if isinstance(d,list) and d else "")' 2>/dev/null)
    PROBE_RENTAL=""
    if [[ -n "$PROBE_PROP" ]]; then
      PROBE_RENTAL=$(curl -s -X POST "$URL/rest/v1/rentals" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "{\"property_id\":\"$PROBE_PROP\",\"landlord_id\":\"$PROBE_ID\",\"monthly_rent\":1,\"start_date\":\"2026-01-01\"}" \
        | python -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if isinstance(d,list) and d else "")' 2>/dev/null)
    fi
    if [[ -z "$PROBE_RENTAL" ]]; then
      bad "could not seed a probe rental for the messages check" "property=$PROBE_PROP"
    else
      code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/messages" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
        -d "{\"rental_id\":\"$PROBE_RENTAL\",\"sender_id\":\"$OTHER\",\"body\":\"probe\"}")
      if [[ "$code" == "403" ]]; then
        ok "rental party cannot post a message as someone else (HTTP $code)"
      else
        bad "MESSAGE SENDER FORGEABLE" "expected 403, got $code"
      fi
      code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/rest/v1/messages" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
        -d "{\"rental_id\":\"$PROBE_RENTAL\",\"sender_id\":\"$PROBE_ID\",\"body\":\"probe\"}")
      if [[ "$code" == "201" ]]; then
        ok "rental party can post a message as themselves (HTTP $code)"
      else
        bad "own message blocked" "expected 201, got $code"
      fi
      # Reassigning an existing message to another sender must also be refused.
      body=$(curl -s -X PATCH "$URL/rest/v1/messages?rental_id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "{\"sender_id\":\"$OTHER\"}")
      if [[ "$body" == "[]" || "$body" == *"42501"* ]]; then
        ok "message cannot be reassigned to another sender"
      else
        bad "MESSAGE SENDER REASSIGNABLE" "${body:0:140}"
      fi
      # ── Column scope on repair requests (039) ──
      # The tenant side had NO update policy (cancel / confirm-fixed / dispute
      # were zero-row writes); the landlord side could rewrite the tenant's
      # description. A second throwaway user becomes the tenant of the probe
      # rental and raises a request; each side then tries the other's columns.
      T_EMAIL="rls-probe-t-$RANDOM@rentybase-test.invalid"
      T_PASS="Probe!Test-$RANDOM-bB"
      T_ID=$(curl -s -X POST "$URL/auth/v1/admin/users" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
        -d "{\"email\":\"$T_EMAIL\",\"password\":\"$T_PASS\",\"email_confirm\":true}" \
        | python -c 'import sys,json; print(json.load(sys.stdin).get("id",""))' 2>/dev/null)
      T_JWT=""
      REPAIR=""
      if [[ -n "$T_ID" ]]; then
        T_JWT=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" \
          -H "apikey: $KEY" -H "Content-Type: application/json" \
          -d "{\"email\":\"$T_EMAIL\",\"password\":\"$T_PASS\"}" \
          | python -c 'import sys,json; print(json.load(sys.stdin).get("access_token",""))' 2>/dev/null)
        curl -s -o /dev/null -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
          -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
          -d "{\"tenant_id\":\"$T_ID\"}"
        REPAIR=$(curl -s -X POST "$URL/rest/v1/repair_requests" \
          -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
          -H "Prefer: return=representation" \
          -d "{\"rental_id\":\"$PROBE_RENTAL\",\"raised_by\":\"$T_ID\",\"title\":\"probe\",\"description\":\"probe\",\"status\":\"open\"}" \
          | python -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if isinstance(d,list) and d else "")' 2>/dev/null)
      fi
      if [[ -z "$REPAIR" || -z "$T_JWT" ]]; then
        bad "could not seed a probe tenant + repair request" "tenant=$T_ID repair=$REPAIR"
      else
        TAUTH="Authorization: Bearer $T_JWT"
        body=$(curl -s -X PATCH "$URL/rest/v1/repair_requests?id=eq.$REPAIR" \
          -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
          -d "{\"resolved_confirmed_at\":\"2026-01-02T00:00:00Z\"}")
        if [[ "$body" == "[{"* ]]; then
          ok "tenant can confirm their own repair as fixed (1 row)"
        else
          bad "TENANT CONFIRM-FIXED IS A DEAD WRITE" "${body:0:140}"
        fi
        code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$URL/rest/v1/repair_requests?id=eq.$REPAIR" \
          -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" \
          -d "{\"cost\":1}")
        if [[ "$code" == "400" ]]; then
          ok "tenant cannot set the cost on their repair request (HTTP $code)"
        else
          bad "TENANT SET REPAIR COST" "expected 400, got $code"
        fi
        body=$(curl -s -X PATCH "$URL/rest/v1/repair_requests?id=eq.$REPAIR" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
          -d "{\"landlord_note\":\"probe\"}")
        if [[ "$body" == "[{"* ]]; then
          ok "landlord can add a note to the tenant's repair request (1 row)"
        else
          bad "landlord repair update blocked" "${body:0:140}"
        fi
        code=$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$URL/rest/v1/repair_requests?id=eq.$REPAIR" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
          -d "{\"description\":\"rewritten by landlord\"}")
        if [[ "$code" == "400" ]]; then
          ok "landlord cannot rewrite the tenant's description (HTTP $code)"
        else
          bad "LANDLORD REWROTE TENANT DESCRIPTION" "expected 400, got $code"
        fi
      fi
      [[ -n "$REPAIR" ]] && curl -s -o /dev/null -X DELETE "$URL/rest/v1/repair_requests?id=eq.$REPAIR" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      # Detach the tenant before the rental goes (rentals.tenant_id has no cascade).
      [[ -n "$T_ID" ]] && curl -s -o /dev/null -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" -d '{"tenant_id":null}'

      # Seeded rows go before the user: rentals.landlord_id has no cascade.
      curl -s -o /dev/null -X DELETE "$URL/rest/v1/messages?rental_id=eq.$PROBE_RENTAL" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      curl -s -o /dev/null -X DELETE "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
    fi
    [[ -n "$PROBE_PROP" ]] && curl -s -o /dev/null -X DELETE "$URL/rest/v1/properties?id=eq.$PROBE_PROP" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"

    # Clean up regardless of outcome.
    [[ -n "${T_ID:-}" ]] && curl -s -o /dev/null -X DELETE "$URL/auth/v1/admin/users/$T_ID" \
      -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
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
