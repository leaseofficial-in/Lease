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

# curl reports 000 when it never got a response at all — DNS, a dropped
# connection, a timeout. That is not a security finding, and a harness that cries
# breach at network noise is one people learn to ignore. Retry once, briefly,
# then report whatever the second attempt says.
CURL="curl -s --max-time 20"

retry_code() {
  local code
  code=$($CURL -o /dev/null -w '%{http_code}' "$@")
  if [[ "$code" == "000" ]]; then
    sleep 2
    code=$($CURL -o /dev/null -w '%{http_code}' "$@")
  fi
  printf '%s' "$code"
}

retry_body() {
  local body
  body=$($CURL "$@")
  if [[ -z "$body" ]]; then
    sleep 2
    body=$($CURL "$@")
  fi
  printf '%s' "$body"
}

# A table an anonymous caller must never read rows from. RLS returns an empty
# array rather than an error, so "[]" is the pass condition — a non-empty body
# means rows leaked.
expect_no_rows() {
  local table="$1"
  local body
  body=$(retry_body "$URL/rest/v1/$table?select=*&limit=3" -H "apikey: $KEY")
  if [[ "$body" == "[]" ]]; then
    ok "$table returns no rows to anon"
  elif [[ -z "$body" ]]; then
    bad "$table check could not reach the API" "no response after a retry"
  else
    bad "$table LEAKED ROWS to anon" "${body:0:160}"
  fi
}

# A table anon must not even be granted SELECT on.
expect_forbidden() {
  local table="$1"
  local code
  code=$(retry_code "$URL/rest/v1/$table?select=*&limit=1" -H "apikey: $KEY")
  if [[ "$code" == "401" || "$code" == "403" ]]; then
    ok "$table is not readable by anon (HTTP $code)"
  elif [[ "$code" == "000" ]]; then
    bad "$table check could not reach the API" "no response after a retry"
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
      # ── Profile identity (049) ──
      # "Users can update their own profile" is USING-only, so every column was
      # editable by its owner -- including `email`, which is where every message
      # this product sends goes, and `role`, which the project's own docs call
      # permanent. Rewriting the address would have had RentyBase deliver mail to
      # somebody else's inbox, from our domain.
      code=$(retry_code -X PATCH "$URL/rest/v1/profiles?id=eq.$PROBE_ID" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
        -d '{"email":"somebody-else@rentybase-test.invalid"}')
      expect_http "a user cannot rewrite their own email address" "400" "$code"

      code=$(retry_code -X PATCH "$URL/rest/v1/profiles?id=eq.$PROBE_ID" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
        -d '{"role":"landlord"}')
      # The probe never completed onboarding, so its role is still null and setting
      # it once is allowed. Either answer is correct; changing an existing one is
      # what must fail, and the SQL proof covers that case directly.
      if [[ "$code" == "204" || "$code" == "400" ]]; then
        code=$(retry_code -X PATCH "$URL/rest/v1/profiles?id=eq.$PROBE_ID" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
          -d '{"role":"tenant"}')
        expect_http "a role cannot be changed once it is set" "400" "$code"
      else
        bad "unexpected answer setting a role" "got $code"
      fi

      body=$(retry_body -X PATCH "$URL/rest/v1/profiles?id=eq.$PROBE_ID" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d '{"full_name":"Probe User"}')
      if [[ "$body" == "[{"* ]]; then
        ok "a user can still edit their own name"
      else
        bad "profile edits blocked entirely" "${body:0:140}"
      fi

      # ── Message notifications (048) ──
      # Messaging is the one feature whose entire purpose is to reach the other
      # person, and nothing notified anybody: no trigger, and `read_at` has never
      # been written, so there was not even an unread badge. Both parties exist by
      # this point in the run, which is what makes the check meaningful.
      #
      # A count, or 0 -- never an empty string. Comparing "" numerically is how a
      # dropped connection becomes a phantom security failure, and a harness that
      # cries wolf is one people stop reading. No line continuations here: the file
      # is CRLF, and a backslash before CR is not one.
      NOTIF_URL="$URL/rest/v1/notifications?select=id&data->>type=eq.message"
      msg_notif_count_once() { $CURL "$NOTIF_URL" -H "apikey: $KEY" -H "$1" -H "Prefer: count=exact" -H "Range: 0-0" -D - -o /dev/null | tr -d '' | awk -F/ '/[Cc]ontent-[Rr]ange/ {print $2}'; }
      count_msg_notifs() {
        local n
        n=$(msg_notif_count_once "$1")
        [[ "$n" =~ ^[0-9]+$ ]] || n=$(msg_notif_count_once "$1")
        [[ "$n" =~ ^[0-9]+$ ]] || n=0
        printf '%s' "$n"
      }
      L_BEFORE=$(count_msg_notifs "$AUTH")
      T_BEFORE=$(count_msg_notifs "$TAUTH")
      curl -s -o /dev/null -X POST "$URL/rest/v1/messages" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" \
        -d "{\"rental_id\":\"$PROBE_RENTAL\",\"sender_id\":\"$T_ID\",\"body\":\"probe message\"}"
      L_AFTER=$(count_msg_notifs "$AUTH")
      T_AFTER=$(count_msg_notifs "$TAUTH")
      if [[ "$L_AFTER" -gt "$L_BEFORE" ]]; then
        ok "a message notifies the other party ($L_BEFORE -> $L_AFTER)"
      else
        bad "A MESSAGE NOTIFIES NOBODY" "landlord notifications stayed at $L_AFTER"
      fi
      if [[ "$T_AFTER" == "$T_BEFORE" ]]; then
        ok "the sender is not notified of their own message"
      else
        bad "sender notified of their own message" "$T_BEFORE -> $T_AFTER"
      fi
      # A burst collapses into the one unread entry rather than stacking.
      curl -s -o /dev/null -X POST "$URL/rest/v1/messages" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" \
        -d "{\"rental_id\":\"$PROBE_RENTAL\",\"sender_id\":\"$T_ID\",\"body\":\"and another\"}"
      L_BURST=$(count_msg_notifs "$AUTH")
      if [[ "$L_BURST" == "$L_AFTER" ]]; then
        ok "a burst of messages stays one unread notification"
      else
        bad "message notifications stack up" "$L_AFTER -> $L_BURST"
      fi

      # ── Invite preview scope (047) ──
      # rental_invite_preview is anon-callable by design -- someone has to see what
      # they are joining before they sign up -- and it used to return the rent, the
      # deposit, the property and the landlord's name for ANY token, forever:
      # after the invite was claimed, after it expired, after the tenancy ended.
      # These codes travel by WhatsApp. Every unclaimed invite in production is
      # expired, so every code ever shared was still disclosing all of that.
      #
      # This runs on a rental of its own. An invite is only "claimable" while
      # tenant_id is null, and borrowing the main probe rental for that would mean
      # detaching its tenant -- which quietly breaks every check after this one.
      INV_TOKEN="PROBEINV$RANDOM"
      INV_RENTAL=$(curl -s -X POST "$URL/rest/v1/rentals" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "{\"property_id\":\"$PROBE_PROP\",\"landlord_id\":\"$PROBE_ID\",\"monthly_rent\":4321,\"start_date\":\"2026-01-01\",\"status\":\"pending_tenant\",\"invite_token\":\"$INV_TOKEN\",\"invite_expires_at\":\"2099-01-01T00:00:00Z\"}" \
        | python -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if isinstance(d,list) and d else "")' 2>/dev/null)
      if [[ -z "$INV_RENTAL" ]]; then
        bad "could not seed a probe invite" "skipping the preview checks"
      else
        body=$(retry_body -X POST "$URL/rest/v1/rpc/rental_invite_preview" \
          -H "apikey: $KEY" -H "Content-Type: application/json" \
          -d "{\"invite_token_input\":\"$INV_TOKEN\"}")
        if [[ "$body" == *'"monthly_rent":4321'* ]]; then
          ok "a live invite still shows the deal to whoever holds the code"
        else
          bad "A LIVE INVITE SHOWS NOTHING" "the join screen would be blank: ${body:0:160}"
        fi

        curl -s -o /dev/null -X PATCH "$URL/rest/v1/rentals?id=eq.$INV_RENTAL" \
          -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
          -d '{"invite_expires_at":"2020-01-01T00:00:00Z"}'
        body=$(retry_body -X POST "$URL/rest/v1/rpc/rental_invite_preview" \
          -H "apikey: $KEY" -H "Content-Type: application/json" \
          -d "{\"invite_token_input\":\"$INV_TOKEN\"}")
        if [[ "$body" == *'"monthly_rent":null'* && "$body" == *'"landlord_name":null'* ]]; then
          ok "an expired code discloses nothing to whoever still has it"
        else
          bad "EXPIRED INVITE STILL LEAKS THE DEAL" "${body:0:160}"
        fi
        # Still enough left to tell the join screen's states apart.
        if [[ "$body" == *'"is_taken"'* && "$body" == *'"invite_expires_at"'* ]]; then
          ok "an expired code still identifies itself as expired"
        else
          bad "join screen cannot tell expired from unknown" "${body:0:160}"
        fi

        curl -s -o /dev/null -X DELETE "$URL/rest/v1/rentals?id=eq.$INV_RENTAL" \
          -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      fi

      # ── Proof review and counterparty notifications (044) ──
      # `notifications` has no INSERT policy, so the tenant's "Notify landlord"
      # button was refused every time while reporting success. The replacement is
      # an RPC that owns its own wording -- neither party can put words in the
      # other's inbox -- and the proof state machine now has the transition scope
      # 042/043 gave payments and agreements.
      code=$(retry_code -X POST "$URL/rest/v1/rpc/notify_rental_counterparty" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" \
        -d "{\"rental_id_input\":\"$PROBE_RENTAL\",\"kind\":\"move_in_proof\"}")
      expect_http "tenant can notify their landlord through the RPC" "200" "$code"

      code=$(retry_code -X POST "$URL/rest/v1/rpc/notify_rental_counterparty" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" \
        -d "{\"rental_id_input\":\"$PROBE_RENTAL\",\"kind\":\"<b>anything they like</b>\"}")
      expect_http "a party cannot choose the wording of a notification" "400" "$code"

      code=$(retry_code -X POST "$URL/rest/v1/rpc/notify_rental_counterparty" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" \
        -d "{\"rental_id_input\":\"00000000-0000-0000-0000-000000000009\",\"kind\":\"move_in_proof\"}")
      expect_http "a party cannot notify on a rental they are not in" "400" "$code"

      code=$(retry_code -X POST "$URL/rest/v1/rpc/notify_rental_counterparty" \
        -H "apikey: $KEY" -H "Content-Type: application/json" \
        -d "{\"rental_id_input\":\"$PROBE_RENTAL\",\"kind\":\"move_in_proof\"}")
      expect_http "anon cannot send a notification" "401" "$code"

      PROOF=$(curl -s -X POST "$URL/rest/v1/proofs" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "{\"rental_id\":\"$PROBE_RENTAL\",\"type\":\"move_in\",\"status\":\"pending\",\"submitted_by\":\"$T_ID\"}" \
        | python -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if isinstance(d,list) and d else "")' 2>/dev/null)
      if [[ -z "$PROOF" ]]; then
        bad "could not seed a probe proof" "skipping the review checks"
      else
        # No tenant UPDATE policy at all, so RLS filters the row out before the
        # trigger ever sees it: the honest answer is "nothing was updated".
        body=$(retry_body -X PATCH "$URL/rest/v1/proofs?id=eq.$PROOF" \
          -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
          -d '{"status":"approved"}')
        if [[ "$body" == "[]" ]]; then
          ok "tenant cannot approve their own move-in proof"
        else
          bad "TENANT APPROVED THEIR OWN PROOF" "${body:0:140}"
        fi

        body=$(retry_body -X PATCH "$URL/rest/v1/proofs?id=eq.$PROOF" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
          -d '{"status":"approved"}')
        if [[ "$body" == *"$PROBE_ID"* ]]; then
          ok "landlord approves, and the reviewer is stamped server-side"
        elif [[ "$body" == "[{"* ]]; then
          bad "reviewer not recorded" "${body:0:140}"
        else
          bad "landlord cannot approve a proof" "${body:0:140}"
        fi

        code=$(retry_code -X PATCH "$URL/rest/v1/proofs?id=eq.$PROOF" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
          -d '{"status":"pending"}')
        expect_http "an approved proof cannot be reopened (it would unfreeze the photos)" "400" "$code"

        curl -s -o /dev/null -X DELETE "$URL/rest/v1/proofs?id=eq.$PROOF" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      fi

      # ── Agreement signing (043) ──
      # The agreement is the one document meant to bind two people, and the
      # dashboard prints both signature timestamps on it. Nothing enforced the
      # order or the ownership of either signature: a tenant could set
      # landlord_signed_at and mark it executed, a landlord could stamp the
      # tenant's signature, and either could back-date one.
      body=$(retry_body -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d '{"agreement_status":"pending_signature"}')
      if [[ "$body" == "[{"* ]]; then
        ok "landlord can send the agreement for signature (1 row)"
      else
        bad "landlord cannot send an agreement" "${body:0:140}"
      fi

      code=$(retry_code -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" \
        -d '{"landlord_signed_at":"2026-01-01T00:00:00Z","agreement_status":"executed"}')
      expect_http "tenant cannot sign for the landlord" "400" "$code"

      body=$(retry_body -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d '{"agreement_signed_at":"2020-01-01T00:00:00Z","agreement_status":"tenant_signed"}')
      if [[ "$body" == *"2020-01-01"* ]]; then
        bad "SIGNATURE CAN BE BACK-DATED" "stored the client's timestamp: ${body:0:200}"
      elif [[ "$body" == "[{"* ]]; then
        ok "tenant signs, and the timestamp is stamped server-side"
      else
        bad "tenant cannot sign their own agreement" "${body:0:140}"
      fi

      code=$(retry_code -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
        -d '{"agreement_custom_clauses":"changed after the tenant signed"}')
      expect_http "clauses cannot be edited after the tenant signed" "400" "$code"

      body=$(retry_body -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d '{"landlord_signed_at":"2026-01-01T00:00:00Z","agreement_status":"executed"}')
      if [[ "$body" == "[{"* ]]; then
        ok "landlord countersigns to execute (1 row)"
      else
        bad "landlord cannot countersign" "${body:0:140}"
      fi

      code=$(retry_code -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" \
        -d '{"agreement_status":"draft"}')
      expect_http "an executed agreement cannot be reopened" "400" "$code"

      # ── Payment transitions (042) ──
      # The policies decide who may write a payment row; nothing decided what they
      # may write. A landlord could UPDATE a *paid* payment back to pending or
      # change its amount, and with UNIQUE (rental_id, month) there is exactly one
      # row per month and no way to record a correction -- the tenant's confirmed
      # receipt was one API call from gone. Seeded far in the future so it cannot
      # collide with a real month.
      PMT=$(curl -s -X POST "$URL/rest/v1/rent_payments" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "{\"rental_id\":\"$PROBE_RENTAL\",\"tenant_id\":\"$T_ID\",\"month\":\"2099-01-01\",\"amount\":1000,\"status\":\"pending\"}" \
        | python -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if isinstance(d,list) and d else "")' 2>/dev/null)
      if [[ -z "$PMT" ]]; then
        bad "could not seed a probe payment" "skipping the transition checks"
      else
        code=$(retry_code -X PATCH "$URL/rest/v1/rent_payments?id=eq.$PMT" \
          -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" -d '{"amount":1}')
        expect_http "tenant cannot change the rent amount on their payment" "400" "$code"

        body=$(retry_body -X PATCH "$URL/rest/v1/rent_payments?id=eq.$PMT" \
          -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
          -d '{"status":"pending_verification","payment_method":"upi","utr_number":"PROBE1"}')
        if [[ "$body" == "[{"* ]]; then
          ok "tenant can submit their payment for confirmation (1 row)"
        else
          bad "TENANT CANNOT SUBMIT A PAYMENT" "${body:0:140}"
        fi

        code=$(retry_code -X PATCH "$URL/rest/v1/rent_payments?id=eq.$PMT" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -d '{"utr_number":"REWRITTEN"}')
        expect_http "landlord cannot rewrite the tenant's payment details" "400" "$code"

        code=$(retry_code -X POST "$URL/rest/v1/rpc/confirm_rent_payment" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -d "{\"payment_id\":\"$PMT\"}")
        expect_http "landlord can confirm a submitted payment" "200" "$code"

        code=$(retry_code -X PATCH "$URL/rest/v1/rent_payments?id=eq.$PMT" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -d '{"status":"pending"}')
        expect_http "a confirmed payment cannot be walked back" "400" "$code"

        code=$(retry_code -X PATCH "$URL/rest/v1/rent_payments?id=eq.$PMT" \
          -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -d '{"amount":1}')
        expect_http "a confirmed payment's amount cannot be changed" "400" "$code"

        # Must go before the delete-scope checks: an unclaimed rental is only
        # deletable while no payment rows hang off it.
        curl -s -o /dev/null -X DELETE "$URL/rest/v1/rent_payments?id=eq.$PMT" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      fi

      # ── The client's queries match the schema ──
      # Not a permission check: a correctness one, in the only place that can
      # catch it. The tenant's deposit screen asked PostgREST for
      # category/payment_method/reference — columns from 002_deposit_enhancements,
      # a migration that collided with another 002 and was never applied. PostgREST
      # 400s the whole request for one unknown column and the client's `|| []`
      # turned that into "no deductions", so every tenant saw an empty deposit
      # ledger. The repair auto-deduction had the mirror bug: `description` (not a
      # column) and no created_by (which its own INSERT policy requires), unchecked,
      # so resolving a repair with "deduct from deposit" never wrote anything.
      # These two strings must stay identical to the ones in the dashboard.
      TENANT_DEPOSIT_SELECT='id,rental_id,type,amount,note,tenant_dispute_note,dispute_status,created_at'
      code=$(curl -s -o /dev/null -w '%{http_code}' \
        "$URL/rest/v1/deposit_transactions?select=$TENANT_DEPOSIT_SELECT&limit=1" \
        -H "apikey: $KEY" -H "$AUTH")
      if [[ "$code" == "200" ]]; then
        ok "the tenant's deposit query matches the schema (HTTP $code)"
      else
        bad "TENANT DEPOSIT QUERY IS INVALID" "expected 200, got $code — a column in the select does not exist"
      fi
      DEP=$(curl -s -X POST "$URL/rest/v1/deposit_transactions" \
        -H "apikey: $KEY" -H "$AUTH" -H "Content-Type: application/json" -H "Prefer: return=representation" \
        -d "{\"rental_id\":\"$PROBE_RENTAL\",\"type\":\"deduction\",\"amount\":1,\"note\":\"probe\",\"created_by\":\"$PROBE_ID\"}" \
        | python -c 'import sys,json; d=json.load(sys.stdin); print(d[0]["id"] if isinstance(d,list) and d else "")' 2>/dev/null)
      if [[ -n "$DEP" ]]; then
        ok "the repair auto-deduction payload is actually insertable"
        curl -s -o /dev/null -X DELETE "$URL/rest/v1/deposit_transactions?id=eq.$DEP" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      else
        bad "REPAIR DEDUCTION PAYLOAD REJECTED" "the deposit ledger silently misses repair deductions"
      fi

      # ── Storage delete scope (041) ──
      # storage.objects had no DELETE policy for any bucket, so nobody could ever
      # remove a file they uploaded: every removed photo and every failed-insert
      # orphan stayed in the bucket forever (there was one such orphan in
      # proof-photos). Direct SQL deletes on storage tables are blocked by
      # Supabase, so this can only be checked through the Storage API — with both
      # probe sessions, which is exactly what is set up here.
      OBJ="$PROBE_RENTAL/probe-$RANDOM.jpg"
      code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$URL/storage/v1/object/repair-photos/$OBJ" \
        -H "apikey: $KEY" -H "$TAUTH" -H "Content-Type: image/jpeg" --data-binary "probe")
      if [[ "$code" == "200" ]]; then
        ok "tenant can upload a repair photo for their rental (HTTP $code)"
      else
        bad "rental photo upload blocked" "expected 200, got $code"
      fi
      # The other party to the same rental may read it but must not destroy it.
      code=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$URL/storage/v1/object/repair-photos/$OBJ" \
        -H "apikey: $KEY" -H "$AUTH")
      if [[ "$code" == "400" || "$code" == "403" ]]; then
        ok "the other party cannot delete a file they did not upload (HTTP $code)"
      else
        bad "OTHER PARTY DELETED SOMEONE ELSE'S UPLOAD" "expected 400/403, got $code"
      fi
      code=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$URL/storage/v1/object/repair-photos/$OBJ" \
        -H "apikey: $KEY" -H "$TAUTH")
      if [[ "$code" == "200" ]]; then
        ok "uploader can delete their own file (HTTP $code)"
      else
        bad "UPLOADER CANNOT DELETE THEIR OWN FILE" "expected 200, got $code"
        curl -s -o /dev/null -X DELETE "$URL/storage/v1/object/repair-photos/$OBJ" \
          -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      fi

      # ── Delete scope (040) ──
      # rentals and properties were each one FOR ALL policy, and everything hangs
      # off rentals with ON DELETE CASCADE — so one REST call could erase a
      # tenant's whole payment ledger. Worse for properties: RLS is not evaluated
      # for cascaded deletes, so a property delete took its rentals with it
      # whatever the rental policy said. A landlord may now delete only a rental
      # nobody joined that has no money attached.
      body=$(curl -s -X DELETE "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$AUTH" -H "Prefer: return=representation")
      if [[ "$body" == "[]" ]]; then
        ok "landlord cannot delete a rental that has a tenant"
      else
        bad "LANDLORD DELETED A LIVE RENTAL" "${body:0:140}"
      fi
      body=$(curl -s -X DELETE "$URL/rest/v1/properties?id=eq.$PROBE_PROP" \
        -H "apikey: $KEY" -H "$AUTH" -H "Prefer: return=representation")
      if [[ "$body" == "[]" ]]; then
        ok "landlord cannot delete a property whose rental has a tenant (cascade guard)"
      else
        bad "PROPERTY DELETE CASCADED PAST THE RENTAL RULE" "${body:0:140}"
      fi

      [[ -n "$REPAIR" ]] && curl -s -o /dev/null -X DELETE "$URL/rest/v1/repair_requests?id=eq.$REPAIR" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      # Detach the tenant, then let the LANDLORD do the cleanup: an unclaimed
      # rental must still be deletable, or 040 has broken the one real case.
      [[ -n "$T_ID" ]] && curl -s -o /dev/null -X PATCH "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR" -H "Content-Type: application/json" -d '{"tenant_id":null}'
      curl -s -o /dev/null -X DELETE "$URL/rest/v1/messages?rental_id=eq.$PROBE_RENTAL" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "$SR"
      body=$(curl -s -X DELETE "$URL/rest/v1/rentals?id=eq.$PROBE_RENTAL" \
        -H "apikey: $KEY" -H "$AUTH" -H "Prefer: return=representation")
      if [[ "$body" == "[{"* ]]; then
        ok "landlord can still delete an unclaimed rental with no money attached"
      else
        bad "UNCLAIMED RENTAL NOT DELETABLE" "${body:0:140}"
      fi

      # Safety net: if any check above bailed early, the seeded rows still go
      # before the user (rentals.landlord_id has no cascade).
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

# ── 6. Client queries against the live schema ─────────────────────────────────
#
# Not a permission check. The tenant's deposit screen was blank for months
# because its select named three columns from a migration that was never applied
# -- PostgREST 400s the whole request for one unknown column, and `data || []`
# renders that as an empty list. Nothing else in this repo asks the database what
# columns it actually has. Same key requirement as section 5, same skip behaviour.
echo
echo "Client queries against the live schema:"
PY=$(command -v python3 || command -v python || true)
if [[ -z "$PY" ]]; then
  echo "  SKIP  no python on PATH"
else
  if "$PY" "$(dirname "$0")/check-schema-drift.py"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
fi

# ── 7. Secrets in the client bundle ───────────────────────────────────────────
#
# Every server secret here is one NEXT_PUBLIC_ prefix or one misplaced import away
# from being compiled into a chunk anyone can download, and the service role key
# would undo every policy in supabase/migrations at once. The build succeeds either
# way and nothing else looks at the output. Skips cleanly when there is no build.
echo
echo "Secrets in the client bundle:"
if [[ -z "$PY" ]]; then
  echo "  SKIP  no python on PATH"
else
  if "$PY" "$(dirname "$0")/check-bundle-secrets.py"; then
    PASS=$((PASS + 1))
  else
    FAIL=$((FAIL + 1))
  fi
fi

# ── summary ───────────────────────────────────────────────────────────────────
echo
echo "─────────────────────────────────────────"
printf '  %d passed, %d failed\n' "$PASS" "$FAIL"
echo

[[ "$FAIL" -eq 0 ]] || exit 1
