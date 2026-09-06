'use client'

// ─── SecureImage ──────────────────────────────────────────────────────────────
//
// Drop-in replacement for <img> wherever the source is a file in Supabase storage.
// It exchanges the stored public URL for a short-lived signed one before painting,
// so private buckets work and a leaked URL stops being useful within the hour.
// See lib/supabase/media.ts for why this exists.
//
// Deliberately renders nothing until the signed URL resolves: once a bucket is
// private the raw URL 403s, so painting it first would guarantee a broken-image
// flash on every photo. Callers keep whatever placeholder they already had by
// testing the RAW value, which keeps layout stable while this resolves.

import { useSignedUrl } from '@/lib/supabase/media'

type SecureImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src?: string | null
  /** Rendered while the signed URL is in flight, and if the source is missing. */
  placeholder?: React.ReactNode
}

export function SecureImage({ src, alt = '', placeholder = null, ...imgProps }: SecureImageProps) {
  const signed = useSignedUrl(src)
  if (!signed) return <>{placeholder}</>
  return <img src={signed} alt={alt} {...imgProps} />
}
