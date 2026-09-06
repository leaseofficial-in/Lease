'use client'

// ─── Content hashing for proof photos ─────────────────────────────────────────
//
// RentyBase tells landlords and tenants that move-in photos are sealed evidence.
// Until this existed, nothing in the codebase backed that up: the file was
// uploaded and a row was written, and no property of the bytes was ever recorded.
//
// A SHA-256 taken before upload does not make a photo unforgeable, and it should
// not be described as if it does. The client computes it, so it attests to what
// this browser saw, not to who saw it. What it does give is a checkable fact: if
// the object in storage stops matching the hash recorded at submission, the file
// has been altered since, and either side can show that in a dispute. That is the
// difference between "trust us" and "here is the check".

/**
 * SHA-256 of a file's bytes, lowercase hex.
 *
 * Uses SubtleCrypto, which the browser only exposes in a secure context. That is
 * satisfied on rentybase.com and on localhost; it is not on a plain-http origin,
 * where `crypto.subtle` is undefined. Returns null there rather than throwing —
 * a missing hash is recorded as unknown, and must never block a tenant from
 * submitting the evidence itself.
 */
export async function sha256Hex(file: Blob): Promise<string | null> {
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return null
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buffer)
    return Array.from(new Uint8Array(digest))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}
