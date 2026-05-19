import { NextResponse } from 'next/server'

// Android App Links verification
// Once you have your release keystore, get the SHA-256 fingerprint:
//   keytool -list -v -keystore rentybase.keystore -alias rentybase
// Replace the placeholder sha256_cert_fingerprints value below with the real fingerprint.
// Also add the Google Play signing fingerprint from Play Console → Setup → App Integrity.

const assetLinks = [
  {
    relation: ['delegate_permission/common.handle_all_urls'],
    target: {
      namespace: 'android_app',
      package_name: 'com.rentybase.app',
      sha256_cert_fingerprints: [
        // TODO: replace with your release keystore SHA-256 fingerprint
        // Example: "AB:CD:EF:12:34:56:78:90:..."
        'REPLACE_WITH_RELEASE_KEYSTORE_SHA256',
        // TODO: replace with Google Play's signing certificate SHA-256 (from Play Console)
        'REPLACE_WITH_PLAY_SIGNING_SHA256',
      ],
    },
  },
]

export function GET() {
  return NextResponse.json(assetLinks, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  })
}
