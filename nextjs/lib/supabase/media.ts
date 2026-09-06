'use client'

// ─── Signed access to stored media ────────────────────────────────────────────
//
// proof-photos and repair-photos were created as PUBLIC buckets, which means the
// `/storage/v1/object/public/...` path bypasses their own "Authenticated read" RLS
// policies entirely: a tenant's move-in photo could be fetched with no session and
// no API key at all. Those photos are pictures of the inside of someone's home,
// kept as deposit evidence, so the intended model — and the one the policies
// describe — is that only the parties to the rental can see them.
//
// The stored columns (proof_photos.public_url, rent_payments.payment_proof_url,
// repair_requests.photo_url) all hold fully-qualified public URLs. Rather than
// migrate that data, this module recovers the bucket and object path FROM those
// URLs and mints a short-lived signed URL instead.
//
// Two properties make the rollout safe, and they are the point of the design:
//
//   1. Signing works on a bucket that is still public. So this can ship, be
//      verified against real photos, and only then are the buckets flipped to
//      private — no window in which stored photos fail to render.
//   2. Every failure path falls back to the original value. A signing error, an
//      unrecognised URL shape, an offline moment: the caller still gets something
//      renderable rather than a blank frame where a tenant's evidence should be.

import { createClient } from '@/lib/supabase/client'
import { useState, useEffect } from 'react'

// One hour. Long enough that a landlord reviewing a set of photos never watches a
// URL expire mid-session, short enough that a leaked link is close to worthless.
const SIGN_TTL_SECONDS = 60 * 60

// Re-signing on every render would be a request per image per paint. Cached by
// bucket+path and retired five minutes early so a URL is never handed out at the
// moment it dies.
const signedCache = new Map<string, { url: string; expiresAt: number }>()
const RENEW_MARGIN_MS = 5 * 60 * 1000

export interface StorageRef {
  bucket: string
  path: string
}

/**
 * Recover { bucket, path } from a Supabase storage URL.
 *
 * Handles both the public form and an already-signed form, so re-signing an
 * expired URL works. Returns null for anything that is not a storage URL — a
 * caller passing an external image or a data: URI should get it back untouched.
 */
export function parseStorageRef(value?: string | null): StorageRef | null {
  if (!value) return null
  const match = value.match(/\/storage\/v1\/object\/(?:public\/|sign\/|authenticated\/)?([^/?]+)\/(.+?)(?:\?|$)/)
  if (!match) return null
  const [, bucket, rawPath] = match
  if (!bucket || !rawPath) return null
  try {
    return { bucket, path: decodeURIComponent(rawPath) }
  } catch {
    // A malformed percent-sequence should not take down an image render.
    return { bucket, path: rawPath }
  }
}

/**
 * Exchange a stored media URL for a short-lived signed one.
 *
 * Never throws and never returns null for a non-empty input: on any failure the
 * original value comes back, so the worst case is the behaviour we had before.
 */
export async function signStorageUrl(value?: string | null): Promise<string | null> {
  if (!value) return null

  const ref = parseStorageRef(value)
  if (!ref) return value // not ours — hand it back unchanged

  const key = `${ref.bucket}/${ref.path}`
  const cached = signedCache.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.url

  try {
    const sb = createClient()
    const { data, error } = await sb.storage
      .from(ref.bucket)
      .createSignedUrl(ref.path, SIGN_TTL_SECONDS)

    if (error || !data?.signedUrl) return value

    signedCache.set(key, {
      url: data.signedUrl,
      expiresAt: Date.now() + SIGN_TTL_SECONDS * 1000 - RENEW_MARGIN_MS,
    })
    return data.signedUrl
  } catch {
    return value
  }
}

/**
 * Resolve a stored media URL to a signed one for rendering.
 *
 * Returns null until the URL is ready, so callers can hold their existing
 * placeholder rather than flashing a broken image. Once the bucket is private an
 * unsigned URL 403s, so rendering the raw value first would guarantee that flash.
 */
export function useSignedUrl(value?: string | null): string | null {
  const [resolved, setResolved] = useState<string | null>(() => {
    if (!value) return null
    const ref = parseStorageRef(value)
    if (!ref) return value
    const cached = signedCache.get(`${ref.bucket}/${ref.path}`)
    return cached && cached.expiresAt > Date.now() ? cached.url : null
  })

  useEffect(() => {
    let active = true
    if (!value) {
      setResolved(null)
      return
    }
    signStorageUrl(value).then(url => {
      if (active) setResolved(url)
    })
    return () => {
      active = false
    }
  }, [value])

  return resolved
}
