import { describe, it, expect } from 'vitest'
import { parseStorageRef } from './media'

// parseStorageRef is the load-bearing part of the private-bucket migration: it
// recovers the bucket and object path from the fully-qualified public URLs already
// stored in proof_photos.public_url, rent_payments.payment_proof_url and
// repair_requests.photo_url. Get it wrong and a tenant's deposit evidence stops
// rendering, so the shapes actually present in the database are pinned here.

const PROJECT = 'https://tuojgwrzfecyeiccdrlj.supabase.co'

describe('parseStorageRef', () => {
  it('parses the public URL shape stored in production', () => {
    // Real shape: <rental>/<proof>/<photo>_<timestamp>.jpg, three UUID segments deep.
    const url = `${PROJECT}/storage/v1/object/public/proof-photos/8a8068ac-4d2d-4347-b5ff-4e90945d8cde/2f98b601-3391-424b-91f5-03994b77ac1a/a879a4c6-5280-4560-b525-a51ad0d86ab1_1777650576064.jpg`
    expect(parseStorageRef(url)).toEqual({
      bucket: 'proof-photos',
      path: '8a8068ac-4d2d-4347-b5ff-4e90945d8cde/2f98b601-3391-424b-91f5-03994b77ac1a/a879a4c6-5280-4560-b525-a51ad0d86ab1_1777650576064.jpg',
    })
  })

  it('parses repair-photos as well as proof-photos', () => {
    const url = `${PROJECT}/storage/v1/object/public/repair-photos/abc/def.png`
    expect(parseStorageRef(url)).toEqual({ bucket: 'repair-photos', path: 'abc/def.png' })
  })

  it('re-parses an already-signed URL so an expired link can be renewed', () => {
    const url = `${PROJECT}/storage/v1/object/sign/proof-photos/abc/def.jpg?token=eyJhbGciOi.abc.def`
    expect(parseStorageRef(url)).toEqual({ bucket: 'proof-photos', path: 'abc/def.jpg' })
  })

  it('drops any query string from the path', () => {
    const url = `${PROJECT}/storage/v1/object/public/avatars/u/pic.jpg?width=64`
    expect(parseStorageRef(url)?.path).toBe('u/pic.jpg')
  })

  it('decodes percent-encoded path segments', () => {
    const url = `${PROJECT}/storage/v1/object/public/proof-photos/room%20one/front%20door.jpg`
    expect(parseStorageRef(url)).toEqual({ bucket: 'proof-photos', path: 'room one/front door.jpg' })
  })

  it('survives a malformed percent-sequence rather than throwing', () => {
    // decodeURIComponent would throw on a lone '%'. An image render must not.
    const url = `${PROJECT}/storage/v1/object/public/proof-photos/bad%zz/x.jpg`
    expect(() => parseStorageRef(url)).not.toThrow()
    expect(parseStorageRef(url)?.bucket).toBe('proof-photos')
  })

  it('returns null for things that are not storage URLs, so they pass through untouched', () => {
    expect(parseStorageRef('https://example.com/photo.jpg')).toBeNull()
    expect(parseStorageRef('data:image/png;base64,iVBORw0KGgo=')).toBeNull()
    expect(parseStorageRef('/local/asset.png')).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(parseStorageRef(undefined)).toBeNull()
    expect(parseStorageRef(null)).toBeNull()
    expect(parseStorageRef('')).toBeNull()
  })
})
